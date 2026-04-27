/**
 * POST /api/fuel-prices/sync  — manually trigger a DOE data fetch (admin/operator)
 * GET  /api/fuel-prices/sync  — check last sync status
 *
 * Also called automatically by the Cloudflare Cron Trigger every Tuesday at 8AM PHT.
 * Cron config in wrangler.toml:
 *   [[triggers.crons]]
 *   crons = ["0 0 * * 2"]   # every Tuesday 00:00 UTC = 08:00 PHT
 *
 * DOE Strategy:
 *   1. Try DOE Oil Price Monitoring CSV (Western Visayas row)
 *   2. Try DOE HTML table fallback
 *   3. If both fail, return { ok: false, reason } without overwriting existing D1 data
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

  // GET — return last sync status from D1 settings
  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      `SELECT value FROM app_settings WHERE key = 'fuel_last_sync'`
    ).first().catch(() => null)
    return json({ status: row ? JSON.parse(row.value) : null })
  }

  // POST — manual trigger (operator+)
  if (request.method === 'POST') {
    const secret  = env.JWT_SECRET ?? 'civic-iloilo-default-secret-change-me'
    const payload = await verifyToken(getBearerToken(request), secret)
    if (!payload || !['admin', 'operator'].includes(payload.role)) {
      return json({ error: 'Operator or Admin token required' }, 403)
    }
    const result = await runSync(env, payload.username ?? 'manual')
    return json(result, result.ok ? 200 : 502)
  }

  return json({ error: 'Method not allowed' }, 405)
}

// ---- Core sync logic -------------------------------------------------------
async function runSync(env, triggeredBy) {
  const today = new Date().toISOString().split('T')[0]

  // Try source 1: DOE Oil Price Monitoring weekly report (CSV via data.gov.ph mirror)
  let result = await tryDoeDataGovPh(today)

  // Try source 2: DOE Oil Monitor site HTML table
  if (!result) result = await tryDoeOilMonitor(today)

  // Try source 3: GovPH Open Data API
  if (!result) result = await tryOpenDataPh(today)

  if (!result) {
    const status = { ok: false, reason: 'All DOE sources unavailable. Please enter prices manually.', checked_at: new Date().toISOString(), triggered_by: triggeredBy }
    await saveStatus(env, status)
    return status
  }

  // Upsert into D1 fuel_prices
  await env.DB.prepare(
    `INSERT INTO fuel_prices (
       as_of, iloilo_gasoline_avg, iloilo_diesel_avg, iloilo_kerosene_avg,
       ph_gasoline_avg, ph_diesel_avg, source, logged_by
     ) VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(as_of) DO UPDATE SET
       iloilo_gasoline_avg = excluded.iloilo_gasoline_avg,
       iloilo_diesel_avg   = excluded.iloilo_diesel_avg,
       iloilo_kerosene_avg = excluded.iloilo_kerosene_avg,
       ph_gasoline_avg     = excluded.ph_gasoline_avg,
       ph_diesel_avg       = excluded.ph_diesel_avg,
       source              = excluded.source`
  ).bind(
    result.as_of,
    result.gasoline_avg  ?? null,
    result.diesel_avg    ?? null,
    result.kerosene_avg  ?? null,
    result.ph_gasoline   ?? null,
    result.ph_diesel     ?? null,
    result.source,
    `auto:${triggeredBy}`,
  ).run()

  // Log to audit
  await env.DB.prepare(
    `INSERT INTO audit_log (action, table_name, record_id, performed_by, details, created_at)
     VALUES ('fuel_sync', 'fuel_prices', ?, 'cron', ?, datetime('now'))`
  ).bind(result.as_of, JSON.stringify({ source: result.source, triggered_by: triggeredBy })).run().catch(() => {})

  const status = { ok: true, as_of: result.as_of, source: result.source, synced_at: new Date().toISOString(), triggered_by: triggeredBy, prices: { gasoline: result.gasoline_avg, diesel: result.diesel_avg, kerosene: result.kerosene_avg } }
  await saveStatus(env, status)
  return status
}

// ---- DOE Source 1: data.gov.ph mirror / DOE CSV ---------------------------
async function tryDoeDataGovPh(today) {
  try {
    // DOE publishes weekly pump price monitoring to data.gov.ph
    // URL pattern observed: https://data.gov.ph/datasets/fuel-price-monitoring
    const res = await fetch(
      'https://data.gov.ph/api/3/action/datastore_search?resource_id=fuel-price-monitoring&limit=10',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const records = data?.result?.records ?? []
    // Find Western Visayas row
    const wv = records.find((r) =>
      (r.Region ?? r.region ?? '').toLowerCase().includes('western visayas') ||
      (r.Region ?? r.region ?? '').toLowerCase().includes('region vi') ||
      (r.Region ?? r.region ?? '').toLowerCase().includes('vi')
    )
    if (!wv) return null
    return {
      as_of:        wv.date ?? wv.Date ?? today,
      gasoline_avg: parseFloat(wv.gasoline ?? wv.Gasoline ?? wv.ron95 ?? 0) || null,
      diesel_avg:   parseFloat(wv.diesel   ?? wv.Diesel   ?? 0) || null,
      kerosene_avg: parseFloat(wv.kerosene ?? wv.Kerosene ?? 0) || null,
      ph_gasoline:  null,
      ph_diesel:    null,
      source:       'DOE · data.gov.ph',
    }
  } catch { return null }
}

// ---- DOE Source 2: oil.doe.gov.ph HTML table --------------------------------
async function tryDoeOilMonitor(today) {
  try {
    const res = await fetch(
      'https://oil.doe.gov.ph/wpm/summary',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0', Accept: 'text/html' }, signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const html = await res.text()

    // Basic regex extraction for Western Visayas row
    // Table format: Region | Gasoline | Diesel | Kerosene
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
  } catch { return null }
}

// ---- DOE Source 3: Open Data PH API ----------------------------------------
async function tryOpenDataPh(today) {
  try {
    // Try CKAN-style API that Open Data PH uses
    const res = await fetch(
      'https://opendata.gov.ph/api/3/action/datastore_search?resource_id=fuel_price_monitoring&limit=20',
      { headers: { 'User-Agent': 'CivicMetroIloilo/1.0' }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const records = data?.result?.records ?? []
    const wv = records.find((r) =>
      JSON.stringify(r).toLowerCase().includes('western visayas') ||
      JSON.stringify(r).toLowerCase().includes('region vi')
    )
    if (!wv) return null
    const vals = Object.values(wv).map(v => parseFloat(v)).filter(n => !isNaN(n) && n > 0)
    return {
      as_of:        today,
      gasoline_avg: vals[0] ?? null,
      diesel_avg:   vals[1] ?? null,
      kerosene_avg: vals[2] ?? null,
      ph_gasoline:  null,
      ph_diesel:    null,
      source:       'DOE · opendata.gov.ph',
    }
  } catch { return null }
}

// ---- Helpers ---------------------------------------------------------------
async function saveStatus(env, status) {
  await env.DB.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('fuel_last_sync', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(JSON.stringify(status)).run().catch(() => {})
}

function getBearerToken(req) {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}
async function verifyToken(token, secret) {
  try {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const enc    = new TextEncoder()
    const key    = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBuf = new Uint8Array(sig.match(/.{2}/g).map(b => parseInt(b, 16)))
    const valid  = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(`${header}.${body}`))
    if (!valid) return null
    const pl = JSON.parse(atob(body))
    if (pl.exp && Math.floor(Date.now() / 1000) > pl.exp) return null
    return pl
  } catch { return null }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
