/**
 * GET   /api/settings          — read all app settings
 * PATCH /api/settings          — update a single setting { key, value }
 */
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase()
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  if (method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        `SELECT key, value, description, updated_at FROM app_settings ORDER BY key ASC`
      ).all()
      return json({ settings: results ?? [] })
    } catch { return json({ settings: [] }) }
  }

  if (method === 'PATCH') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { key, value } = body
    if (!key || value === undefined) return json({ error: 'key and value required' }, 400)

    await env.DB.prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, String(value)).run()

    await writeAudit(env.DB, 'setting_updated', 'app_settings', key, JSON.stringify({ value }))
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
