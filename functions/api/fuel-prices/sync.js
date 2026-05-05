/**
 * POST /api/fuel-prices/sync  -- manually trigger a DOE data fetch (admin/operator)
 * GET  /api/fuel-prices/sync  -- check last sync status
 *
 * Also called automatically by the Cloudflare Cron Trigger every Tuesday at 8AM PHT.
 *
 * Source priority (tries each in order, stops at first success):
 *   0. DOE CMS VFO PDF  (prod-cms.doe.gov.ph weekly PDF -- Western Visayas row)
 *   1. DOE data.gov.ph CSV
 *   2. DOE oil.doe.gov.ph HTML table
 *   3. GovPH Open Data API (opendata.gov.ph)
 *   4. GlobalPetrolPrices.com scrape (PH national -- ph_gasoline/ph_diesel only)
 *
 * Sources 0-3 target Iloilo / Western Visayas regional prices.
 * Source 4 always runs in parallel to fill ph_gasoline_avg / ph_diesel_avg.
 * If all regional sources fail, Source 4 national prices are used as fallback.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

// ---- Cloudflare Cron entrypoint -------------------------------------------
export async function scheduled(event, env, ctx) {
  ctx.waitUntil(runSync(env, 'cron'))
}

// ---- HTTP entrypoint -------------------------------------------------------
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      "SELECT value FROM app_settings WHERE key = 'fuel_last_sync'"
    ).first().catch(function() { return null })
    return json({ status: row ? JSON.parse(row.value) : null })
  }

  if (request.method === 'POST') {
    const secret  = env.JWT_SECRET || 'civic-iloilo-default-secret-change-me'
    const payload = await verifyToken(getBearerToken(request), secret)
    if (!payload || !['admin', 'operator'].includes(payload.role)) {
      return json({ error: 'Operator or Admin token required' }, 403)
    }
    const result = await runSync(env, payload.username || 'manual')
    return json(result, result.ok ? 200 : 502)
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ---- Core sync logic -------------------------------------------------------
async function runSync(env, triggeredBy) {
  var today = new Date().toISOString().split('T')[0]

  // Source 4 always runs in parallel (national PH context)
  var gppPromise = tryGlobalPetrolPrices(today)

  // Try regional sources 0-3 in priority order
  var result = await tryDoeCmsPdf(today)
  if (!result) result = await tryDoeDataGovPh(today)
  if (!result) result = await tryDoeOilMonitor(today)
  if (!result) result = await tryOpenDataPh(today)

  var gpp = await gppPromise

  if (result) {
    if (gpp) {
      result.ph_gasoline = result.ph_gasoline || gpp.ph_gasoline
      result.ph_diesel   = result.ph_diesel   || gpp.ph_diesel
      result.source      = result.source + ' + GlobalPetrolPrices'
    }
  } else if (gpp) {
    result = {
      as_of:        gpp.as_of,
      gasoline_avg: gpp.ph_gasoline,
      diesel_avg:   gpp.ph_diesel,
      kerosene_avg: null,
      ph_gasoline:  gpp.ph_gasoline,
      ph_diesel:    gpp.ph_diesel,
      source:       'GlobalPetrolPrices.com (PH national fallback)',
    }
  } else {
    var failStatus = {
      ok:           false,
      reason:       'All sources unavailable (DOE PDF + DOE APIs + GlobalPetrolPrices). Please enter prices manually.',
      checked_at:   new Date().toISOString(),
      triggered_by: triggeredBy,
    }
    await saveStatus(env, failStatus)
    return failStatus
  }

  await env.DB.prepare(
    'INSERT INTO fuel_prices (' +
    '  as_of, iloilo_gasoline_avg, iloilo_diesel_avg, iloilo_kerosene_avg,' +
    '  ph_gasoline_avg, ph_diesel_avg, source, logged_by' +
    ') VALUES (?,?,?,?,?,?,?,?)' +
    ' ON CONFLICT(as_of) DO UPDATE SET' +
    '  iloilo_gasoline_avg = excluded.iloilo_gasoline_avg,' +
    '  iloilo_diesel_avg   = excluded.iloilo_diesel_avg,' +
    '  iloilo_kerosene_avg = excluded.iloilo_kerosene_avg,' +
    '  ph_gasoline_avg     = excluded.ph_gasoline_avg,' +
    '  ph_diesel_avg       = excluded.ph_diesel_avg,' +
    '  source              = excluded.source'
  ).bind(
    result.as_of,
    result.gasoline_avg || null,
    result.diesel_avg   || null,
    result.kerosene_avg || null,
    result.ph_gasoline  || null,
    result.ph_diesel    || null,
    result.source,
    'auto:' + triggeredBy
  ).run()

  await env.DB.prepare(
    'INSERT INTO audit_log (action, table_name, record_id, performed_by, details, created_at)' +
    " VALUES ('fuel_sync', 'fuel_prices', ?, 'cron', ?, datetime('now'))"
  ).bind(
    result.as_of,
    JSON.stringify({ source: result.source, triggered_by: triggeredBy })
  ).run().catch(function() {})

  var status = {
    ok:           true,
    as_of:        result.as_of,
    source:       result.source,
    synced_at:    new Date().toISOString(),
    triggered_by: triggeredBy,
    prices: {
      gasoline:    result.gasoline_avg,
      diesel:      result.diesel_avg,
      kerosene:    result.kerosene_avg,
      ph_gasoline: result.ph_gasoline,
      ph_diesel:   result.ph_diesel,
    },
  }
  await saveStatus(env, status)
  return status
}

// ---- Source 0: DOE CMS VFO PDF scraper -------------------------------------
// The DOE publishes a weekly PDF at:
//   https://prod-cms.doe.gov.ph/documents/d/guest/vfo-price-monitoring-MMDDYY-pdf
// where MMDDYY = the Monday date of the reporting week.
// We generate candidate slugs for this week and last week, fetch the PDF as
// plain text, then regex-parse the Western Visayas row.
//
// PDF text extraction works because Cloudflare Workers can read PDF raw bytes
// and the DOE VFO PDF embeds text (not scanned images).
async function tryDoeCmsPdf(today) {
  var slugs = buildPdfSlugs(today)
  for (var i = 0; i < slugs.length; i++) {
    var result = await fetchAndParsePdf(slugs[i])
    if (result) return result
  }
  return null
}

// Build PDF slug candidates: this Monday + last two Mondays
function buildPdfSlugs(today) {
  var base  = new Date(today)
  var slugs = []
  // Try this week's Monday and the two prior Mondays
  for (var offset = 0; offset <= 14; offset += 7) {
    var d = new Date(base)
    d.setDate(d.getDate() - offset)
    // Snap back to the Monday of that week
    var day = d.getDay() // 0=Sun,1=Mon...
    var diff = day === 0 ? -6 : 1 - day  // days to Monday
    d.setDate(d.getDate() + diff)
    var mm  = String(d.getMonth() + 1).padStart(2, '0')
    var dd  = String(d.getDate()).padStart(2, '0')
    var yy  = String(d.getFullYear()).slice(-2)
    slugs.push('vfo-price-monitoring-' + mm + dd + yy + '-pdf')
  }
  return slugs
}

async function fetchAndParsePdf(slug) {
  var url = 'https://prod-cms.doe.gov.ph/documents/d/guest/' + slug
  try {
    var res = await fetch(url, {
      headers: {
        'User-Agent': 'CivicMetroIloilo/1.0',
        'Accept':     'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    var ct = res.headers.get('content-type') || ''
    // Accept PDF or HTML (DOE sometimes returns HTML summary)
    var raw = await res.text()
    if (!raw || raw.length < 200) return null
    return parseDoePdfText(raw, slug)
  } catch(e) { return null }
}

// Parse extracted PDF/HTML text for Western Visayas price row.
// DOE VFO PDF text layout (when extracted) looks like:
//   ...WESTERN VISAYAS  65.30  63.40  67.20  45.70  42.90  48.50  63.50  60.50  66.00...
// Columns: Region | Gas Avg | Gas Min | Gas Max | Diesel Avg | Diesel Min | Diesel Max | Kero Avg | Kero Min | Kero Max
// Some versions use: Region | Gas Min | Gas Max | Gas Avg | ...
// We capture 9 consecutive numbers after the WV match and try both layouts.
function parseDoePdfText(text, slug) {
  // Normalise line breaks and collapse whitespace
  var clean = text.replace(/\r\n|\r/g, '\n').replace(/[ \t]+/g, ' ')

  // Try matching Western Visayas / Region VI row
  var patterns = [
    /WESTERN\s+VISAYAS\s+([\d.]+(?:\s+[\d.]+){5,11})/i,
    /Region\s+VI\b[^\n]*([\d.]+(?:\s+[\d.]+){5,11})/i,
    /\bVI\b\s+WESTERN\s+VISAYAS\s+([\d.]+(?:\s+[\d.]+){5,11})/i,
  ]

  var nums = null
  for (var p = 0; p < patterns.length; p++) {
    var m = clean.match(patterns[p])
    if (m) {
      nums = m[1].trim().split(/\s+/).map(parseFloat).filter(function(n) { return !isNaN(n) && n > 10 && n < 200 })
      if (nums.length >= 6) break
      nums = null
    }
  }
  if (!nums || nums.length < 6) return null

  // Try to determine column layout by checking if numbers are plausible
  // Layout A (avg, min, max per fuel): [gasAvg, gasMin, gasMax, dieAvg, dieMin, dieMax, ...]
  // Layout B (min, max, avg per fuel): [gasMin, gasMax, gasAvg, dieMin, dieMax, dieAvg, ...]
  var gasoline_avg, gasoline_min, gasoline_max
  var diesel_avg,   diesel_min,   diesel_max
  var kerosene_avg, kerosene_min, kerosene_max

  // Heuristic: avg is usually between min and max
  if (nums[0] >= nums[1] && nums[0] <= nums[2]) {
    // Layout A: avg, min, max
    gasoline_avg = nums[0]; gasoline_min = nums[1]; gasoline_max = nums[2]
    diesel_avg   = nums[3]; diesel_min   = nums[4]; diesel_max   = nums[5]
    kerosene_avg = nums[6] || null; kerosene_min = nums[7] || null; kerosene_max = nums[8] || null
  } else {
    // Layout B: min, max, avg
    gasoline_min = nums[0]; gasoline_max = nums[1]; gasoline_avg = nums[2]
    diesel_min   = nums[3]; diesel_max   = nums[4]; diesel_avg   = nums[5]
    kerosene_min = nums[6] || null; kerosene_max = nums[7] || null; kerosene_avg = nums[8] || null
  }

  // Derive as_of date from slug: vfo-price-monitoring-MMDDYY-pdf
  var as_of = deriveDateFromSlug(slug)

  return {
    as_of:        as_of,
    gasoline_avg: gasoline_avg || null,
    gasoline_min: gasoline_min || null,
    gasoline_max: gasoline_max || null,
    diesel_avg:   diesel_avg   || null,
    diesel_min:   diesel_min   || null,
    diesel_max:   diesel_max   || null,
    kerosene_avg: kerosene_avg || null,
    kerosene_min: kerosene_min || null,
    kerosene_max: kerosene_max || null,
    ph_gasoline:  null,
    ph_diesel:    null,
    source:       'DOE VFO PDF (' + slug + ')',
  }
}

function deriveDateFromSlug(slug) {
  // slug: vfo-price-monitoring-MMDDYY-pdf
  var m = slug.match(/(\d{2})(\d{2})(\d{2})-pdf/)
  if (!m) return new Date().toISOString().split('T')[0]
  var month = parseInt(m[1], 10)
  var day   = parseInt(m[2], 10)
  var year  = 2000 + parseInt(m[3], 10)
  var d = new Date(year, month - 1, day)
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0]
  return d.toISOString().split('T')[0]
}

// ---- Source 1: DOE data.gov.ph CSV ----------------------------------------
async function tryDoeDataGovPh(today) {
  try {
    var res = await fetch(
      'https://data.gov.ph/api/3/action/datastore_search?resource_id=fuel-price-monitoring&limit=10',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    var data    = await res.json()
    var records = data && data.result && data.result.records ? data.result.records : []
    var wv = records.find(function(r) {
      var reg = (r.Region || r.region || '').toLowerCase()
      return reg.includes('western visayas') || reg.includes('region vi')
    })
    if (!wv) return null
    return {
      as_of:        wv.date || wv.Date || today,
      gasoline_avg: parseFloat(wv.gasoline || wv.Gasoline || wv.ron95 || 0) || null,
      diesel_avg:   parseFloat(wv.diesel   || wv.Diesel   || 0) || null,
      kerosene_avg: parseFloat(wv.kerosene || wv.Kerosene || 0) || null,
      ph_gasoline:  null,
      ph_diesel:    null,
      source:       'DOE · data.gov.ph',
    }
  } catch(e) { return null }
}

// ---- Source 2: oil.doe.gov.ph HTML table -----------------------------------
async function tryDoeOilMonitor(today) {
  try {
    var res = await fetch(
      'https://oil.doe.gov.ph/wpm/summary',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    var html    = await res.text()
    var wvMatch = html.match(
      /western visayas[^<]*<\/td>[\s\S]{0,200}?<td[^>]*>([\d.]+)<\/td>[\s\S]{0,100}?<td[^>]*>([\d.]+)<\/td>[\s\S]{0,100}?<td[^>]*>([\d.]+)<\/td>/i
    )
    if (!wvMatch) return null
    return {
      as_of:        today,
      gasoline_avg: parseFloat(wvMatch[1]) || null,
      diesel_avg:   parseFloat(wvMatch[2]) || null,
      kerosene_avg: parseFloat(wvMatch[3]) || null,
      ph_gasoline:  null,
      ph_diesel:    null,
      source:       'DOE · oil.doe.gov.ph',
    }
  } catch(e) { return null }
}

// ---- Source 3: opendata.gov.ph CKAN API ------------------------------------
async function tryOpenDataPh(today) {
  try {
    var res = await fetch(
      'https://opendata.gov.ph/api/3/action/datastore_search?resource_id=fuel_price_monitoring&limit=20',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    var data    = await res.json()
    var records = data && data.result && data.result.records ? data.result.records : []
    var wv = records.find(function(r) {
      var s = JSON.stringify(r).toLowerCase()
      return s.includes('western visayas') || s.includes('region vi')
    })
    if (!wv) return null
    var vals = Object.values(wv).map(function(v) { return parseFloat(v) }).filter(function(n) { return !isNaN(n) && n > 0 })
    return {
      as_of:        today,
      gasoline_avg: vals[0] || null,
      diesel_avg:   vals[1] || null,
      kerosene_avg: vals[2] || null,
      ph_gasoline:  null,
      ph_diesel:    null,
      source:       'DOE · opendata.gov.ph',
    }
  } catch(e) { return null }
}

// ---- Source 4: GlobalPetrolPrices.com (PH national) -----------------------
async function tryGlobalPetrolPrices(today) {
  try {
    var results = await Promise.all([
      fetch('https://www.globalpetrolprices.com/Philippines/gasoline_prices/',
        { headers: { 'User-Agent': 'CivicMetroIloilo/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(10000) }),
      fetch('https://www.globalpetrolprices.com/Philippines/diesel_prices/',
        { headers: { 'User-Agent': 'CivicMetroIloilo/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(10000) }),
    ])
    var gasRes    = results[0]
    var dieselRes = results[1]
    if (!gasRes.ok || !dieselRes.ok) return null
    var gasHtml    = await gasRes.text()
    var dieselHtml = await dieselRes.text()
    var gasPHP    = extractPhpPrice(gasHtml)
    var dieselPHP = extractPhpPrice(dieselHtml)
    if (!gasPHP && !dieselPHP) return null
    var asOf = extractGppDate(gasHtml) || today
    return { as_of: asOf, ph_gasoline: gasPHP, ph_diesel: dieselPHP, source: 'GlobalPetrolPrices.com' }
  } catch(e) { return null }
}

function extractPhpPrice(html) {
  var m = html.match(/PHP\s+([\d,]+\.\d{1,2})\s+per\s+liter/i)
  if (m) return parseFloat(m[1].replace(',', '')) || null
  var m2 = html.match(/current\s+price[^|]*\|[^|]*([\d.]{4,7})/i)
  if (m2) return parseFloat(m2[1]) || null
  return null
}

function extractGppDate(html) {
  var m = html.match(/prices?,\s+(\d{1,2}-[A-Za-z]+-\d{4})/i)
  if (!m) return null
  try {
    var d = new Date(m[1])
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  } catch(e) { return null }
}

// ---- Helpers ---------------------------------------------------------------
async function saveStatus(env, status) {
  await env.DB.prepare(
    "INSERT INTO app_settings (key, value, updated_at) VALUES ('fuel_last_sync', ?, datetime('now'))" +
    ' ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).bind(JSON.stringify(status)).run().catch(function() {})
}

function getBearerToken(req) {
  var auth = req.headers.get('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

async function verifyToken(token, secret) {
  try {
    if (!token) return null
    var parts = token.split('.')
    if (parts.length !== 3) return null
    var header = parts[0], body = parts[1], sig = parts[2]
    var b64    = sig.replace(/-/g, '+').replace(/_/g, '/').padEnd(sig.length + (4 - sig.length % 4) % 4, '=')
    var binary = atob(b64)
    var sigBuf = new Uint8Array(binary.length)
    for (var i = 0; i < binary.length; i++) sigBuf[i] = binary.charCodeAt(i)
    var enc   = new TextEncoder()
    var key   = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    )
    var valid = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(header + '.' + body))
    if (!valid) return null
    var pl = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))
    if (pl.exp && Math.floor(Date.now() / 1000) > pl.exp) return null
    return pl
  } catch(e) { return null }
}

function json(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: CORS })
}
