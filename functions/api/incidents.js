/**
 * GET  /api/incidents           — list incidents (filter: status, district, type, days)
 * POST /api/incidents           — create a new incident
 * PATCH /api/incidents          — update status (resolve/delete)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

export async function onRequest(ctx) {
  const { request, env } = ctx
  const url    = new URL(request.url)
  const method = request.method.toUpperCase()

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  // --- GET /api/incidents ---
  if (method === 'GET') {
    const status   = url.searchParams.get('status')   ?? null  // active | resolved | all
    const district = url.searchParams.get('district') ?? null
    const type     = url.searchParams.get('type')     ?? null
    const days     = parseInt(url.searchParams.get('days') ?? '30')

    let query = `SELECT * FROM incidents WHERE reported_at >= datetime('now', '-${days} days')`
    const binds = []

    if (status && status !== 'all') { query += ` AND status = ?`;   binds.push(status) }
    if (district)                   { query += ` AND district = ?`; binds.push(district) }
    if (type)                       { query += ` AND type = ?`;     binds.push(type) }

    query += ` ORDER BY reported_at DESC LIMIT 100`

    const { results } = await env.DB.prepare(query).bind(...binds).all()
    return json({ incidents: results, count: results.length })
  }

  // --- POST /api/incidents ---
  if (method === 'POST') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { id, type, severity, district, address, description, reporter, lat, lng } = body
    if (!type || !district || !description)
      return json({ error: 'Missing required fields: type, district, description' }, 400)

    const incId = id ?? `inc-${Date.now()}`

    await env.DB.prepare(
      `INSERT INTO incidents (id, type, severity, district, address, description, reporter, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      incId, type, severity ?? 'moderate', district,
      address ?? null, description, reporter ?? null,
      lat ?? null, lng ?? null
    ).run()

    return json({ success: true, id: incId }, 201)
  }

  // --- PATCH /api/incidents ---
  if (method === 'PATCH') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { id, action } = body
    if (!id || !action) return json({ error: 'Missing id or action' }, 400)

    if (action === 'resolve') {
      await env.DB.prepare(
        `UPDATE incidents SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?`
      ).bind(id).run()
      return json({ success: true })
    }

    if (action === 'delete') {
      await env.DB.prepare(`DELETE FROM incidents WHERE id = ?`).bind(id).run()
      return json({ success: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  }

  return json({ error: 'Method not allowed' }, 405)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
