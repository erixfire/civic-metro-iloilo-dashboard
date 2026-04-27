/**
 * GET   /api/kitchen-sites           — list all sites
 * POST  /api/kitchen-sites           — create site
 * PATCH /api/kitchen-sites           — update / toggle active { id, ...fields }
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
    try {
      const { results } = await env.DB.prepare(
        `SELECT * FROM kitchen_sites ORDER BY name ASC`
      ).all()
      return json({ sites: results ?? [] })
    } catch { return json({ sites: [] }) }
  }

  if (method === 'POST') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { name, barangay, district, address, capacity, contact_person, contact_no } = body
    if (!name || !barangay) return json({ error: 'name and barangay required' }, 400)

    const id = `ks-${Date.now()}`
    await env.DB.prepare(
      `INSERT OR IGNORE INTO kitchen_sites
         (id, name, barangay, district, address, capacity, contact_person, contact_no)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(id, name, barangay, district ?? null, address ?? null,
      capacity ?? null, contact_person ?? null, contact_no ?? null).run()

    await writeAudit(env.DB, 'kitchen_site_added', 'kitchen_sites', id,
      JSON.stringify({ name, barangay }))
    return json({ ok: true, id }, 201)
  }

  if (method === 'PATCH') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
    const { id, is_active, name, address, capacity, contact_person, contact_no } = body
    if (!id) return json({ error: 'id required' }, 400)

    await env.DB.prepare(
      `UPDATE kitchen_sites SET
         is_active      = COALESCE(?, is_active),
         name           = COALESCE(?, name),
         address        = COALESCE(?, address),
         capacity       = COALESCE(?, capacity),
         contact_person = COALESCE(?, contact_person),
         contact_no     = COALESCE(?, contact_no),
         updated_at     = datetime('now')
       WHERE id = ?`
    ).bind(is_active ?? null, name ?? null, address ?? null,
      capacity ?? null, contact_person ?? null, contact_no ?? null, id).run()

    await writeAudit(env.DB, 'kitchen_site_updated', 'kitchen_sites', id, JSON.stringify(body))
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(`INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`)
      .bind(action, table_name, String(record_id), details).run()
  } catch (_) {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
