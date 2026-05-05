/**
 * POST /api/fuel-prices/sync  -- manually trigger a DOE data fetch (admin/operator)
 * GET  /api/fuel-prices/sync  -- check last sync status
 *
 * Also called automatically by the Cloudflare Cron Trigger every Tuesday at 8AM PHT.
 *
 * Source priority (tries each in order, stops at first success):
 *   1. DOE Oil Price Monitoring CSV via data.gov.ph
 *   2. DOE Oil Monitor HTML table (oil.doe.gov.ph)
 *   3. GovPH Open Data API (opendata.gov.ph)
 *   4. GlobalPetrolPrices.com scrape (PH national prices -- used as ph_gasoline / ph_diesel)
 *
 * Note: Sources 1-3 return Iloilo / Western Visayas regional prices.
 *       Source 4 (GlobalPetrolPrices) returns national PH prices only --
 *       it fills ph_gasoline_avg and ph_diesel_avg, and acts as
 *       iloilo_gasoline_avg / iloilo_diesel_avg fallback if all regional sources fail.
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
    ).first().catch(() => null)
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
  const today = new Date().toISOString().split('T')[0]

  // Always fetch GlobalPetrolPrices in parallel (national PH context)
  const gppPromise = tryGlobalPetrolPrices(today)

  // Try regional DOE sources first
  let result = await tryDoeDataGovPh(today)
  if (!result) result = await tryDoeOilMonitor(today)
  if (!result) result = await tryOpenDataPh(today)

  // Resolve GPP result
  const gpp = await gppPromise

  if (result) {
    // Enrich with national PH prices from GPP if not already set
    if (gpp) {
      result.ph_gasoline = result.ph_gasoline || gpp.ph_gasoline
      result.ph_diesel   = result.ph_diesel   || gpp.ph_diesel
      result.source      = result.source + (gpp ? ' + GlobalPetrolPrices' : '')
    }
  } else if (gpp) {
    // All DOE sources failed -- use GPP national prices as fallback
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
    const status = {
      ok:           false,
      reason:       'All sources unavailable (DOE + GlobalPetrolPrices). Please enter prices manually.',
      checked_at:   new Date().toISOString(),
      triggered_by: triggeredBy,
    }
    await saveStatus(env, status)
    return status
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

  const status = {
    ok:           true,
    as_of:        result.as_of,
    source:       result.source,
    synced_at:    new Date().toISOString(),
    triggered_by: triggeredBy,
    prices: {
      gasoline:     result.gasoline_avg,
      diesel:       result.diesel_avg,
      kerosene:     result.kerosene_avg,
      ph_gasoline:  result.ph_gasoline,
      ph_diesel:    result.ph_diesel,
    },
  }
  await saveStatus(env, status)
  return status
}

// ---- Source 1: DOE data.gov.ph CSV ----------------------------------------
async function tryDoeDataGovPh(today) {
  try {
    const res = await fetch(
      'https://data.gov.ph/api/3/action/datastore_search?resource_id=fuel-price-monitoring&limit=10',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data    = await res.json()
    const records = data && data.result && data.result.records ? data.result.records : []
    const wv = records.find(function(r) {
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
    const res = await fetch(
      'https://oil.doe.gov.ph/wpm/summary',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const html    = await res.text()
    const wvMatch = html.match(
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
    const res = await fetch(
      'https://opendata.gov.ph/api/3/action/datastore_search?resource_id=fuel_price_monitoring&limit=20',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data    = await res.json()
    const records = data && data.result && data.result.records ? data.result.records : []
    const wv = records.find(function(r) {
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

// ---- Source 4: GlobalPetrolPrices.com scrape (PH national) ----------------
// Scrapes the PH gasoline and diesel price pages.
// Returns national PH prices in PHP/liter (used for ph_gasoline / ph_diesel columns).
// Updated weekly by GPP from DOE PH data.
async function tryGlobalPetrolPrices(today) {
  try {
    var [gasRes, dieselRes] = await Promise.all([
      fetch('https://www.globalpetrolprices.com/Philippines/gasoline_prices/',
        { headers: { 'User-Agent': 'CivicMetroIloilo/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(10000) }),
      fetch('https://www.globalpetrolprices.com/Philippines/diesel_prices/',
        { headers: { 'User-Agent': 'CivicMetroIloilo/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(10000) }),
    ])

    if (!gasRes.ok || !dieselRes.ok) return null

    var gasHtml   = await gasRes.text()
    var dieselHtml = await dieselRes.text()

    // Price appears as: "PHP 83.70 per liter" or in the table as the current price row
    // Pattern: current price in PHP
    var gasPHP    = extractPhpPrice(gasHtml)
    var dieselPHP = extractPhpPrice(dieselHtml)

    if (!gasPHP && !dieselPHP) return null

    // Try to extract the last-update date from the page (format: DD-Mon-YYYY)
    var asOf = extractGppDate(gasHtml) || today

    return {
      as_of:       asOf,
      ph_gasoline: gasPHP,
      ph_diesel:   dieselPHP,
      source:      'GlobalPetrolPrices.com',
    }
  } catch(e) { return null }
}

// Extract the current PHP/liter price from a GPP page
// Matches: "PHP 83.70 per liter" or "is PHP 83.70 per liter"
function extractPhpPrice(html) {
  var m = html.match(/PHP\s+([\d,]+\.\d{1,2})\s+per\s+liter/i)
  if (m) return parseFloat(m[1].replace(',', '')) || null
  // Fallback: look for Current price row in table: | Current price | 83.70 |
  var m2 = html.match(/current\s+price[^|]*\|[^|]*([\d.]{4,7})/i)
  if (m2) return parseFloat(m2[1]) || null
  return null
}

// Extract update date from GPP page title: "Philippines gasoline prices, 27-Apr-2026"
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
