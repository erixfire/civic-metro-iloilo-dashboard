/**
 * GET   /api/utility-alerts           — active alerts
 * POST  /api/utility-alerts           — create alert
 * PATCH /api/utility-alerts           — update / deactivate { id, ...fields }
 */
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase()
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  if (method === 'GET') {
    const url = new URL(request.url)
    const all = url.searchParams.get('all') === '1'
    const { results } = await env.DB.prepare(
      all
        ? `SELECT * FROM utility_alerts ORDER BY created_at DESC LIMIT 50`
        : `SELECT * FROM utility_alerts WHERE is_active = 1 ORDER BY created_at DESC`
    ).all()
    return json({ alerts: results ?? [] })
  }

  if (method === 'POST') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { provider, type, severity, title, areas, start_dt, end_dt, reason, logged_by } = body
    if (!provider || !title) return json({ error: 'provider and title required' }, 400)

    const id = `ua-${Date.now()}`
    await env.DB.prepare(
      `INSERT INTO utility_alerts
         (id, provider, type, severity, title, areas, start_dt, end_dt, reason, logged_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, provider, type ?? 'outage',
      severity ?? 'warning', title,
      areas    ?? null,
      start_dt ?? null, end_dt ?? null,
      reason   ?? null, logged_by ?? null
    ).run()

    await writeAudit(env.DB, 'utility_alert_added', 'utility_alerts', id, JSON.stringify({ provider, title, severity }))
    return json({ success: true, id }, 201)
  }

  if (method === 'PATCH') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { id, is_active, title, reason, end_dt, severity } = body
    if (!id) return json({ error: 'id required' }, 400)

    await env.DB.prepare(
      `UPDATE utility_alerts SET
         is_active = COALESCE(?, is_active),
         title     = COALESCE(?, title),
         reason    = COALESCE(?, reason),
         end_dt    = COALESCE(?, end_dt),
         severity  = COALESCE(?, severity),
         updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      is_active ?? null, title ?? null,
      reason    ?? null, end_dt ?? null,
      severity  ?? null, id
    ).run()

    await writeAudit(env.DB, 'utility_alert_updated', 'utility_alerts', id, JSON.stringify(body))
    return json({ success: true })
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
