/**
 * GET  /api/heat-index        — latest readings from D1
 * POST /api/heat-index        — log a new reading (admin)
 */
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase()
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  if (method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM heat_index_log ORDER BY log_date DESC, created_at DESC LIMIT 30`
    ).all()
    return json({ readings: results ?? [] })
  }

  if (method === 'POST') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { log_date, area, heat_index_c, level, source, logged_by } = body
    if (!log_date || !heat_index_c) return json({ error: 'log_date and heat_index_c are required' }, 400)

    await env.DB.prepare(
      `INSERT INTO heat_index_log (log_date, area, heat_index_c, level, source, logged_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(log_date, area) DO UPDATE SET
         heat_index_c = excluded.heat_index_c,
         level        = excluded.level,
         source       = excluded.source`
    ).bind(
      log_date,
      area       ?? 'Iloilo City',
      heat_index_c,
      level      ?? 'Extreme Caution',
      source     ?? 'PAGASA / Admin',
      logged_by  ?? null
    ).run()

    // Audit log
    await writeAudit(env.DB, 'heat_index_saved', 'heat_index_log', log_date,
      JSON.stringify({ area, heat_index_c, level }))

    return json({ success: true }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(
      `INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`
    ).bind(action, table_name, String(record_id), details).run()
  } catch (_) {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
