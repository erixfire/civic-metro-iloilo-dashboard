/**
 * GET   /api/incidents               — list (filter: status, district, type, days, format=csv)
 * POST  /api/incidents               — public: creates as status=pending; authenticated: status=active
 * PATCH /api/incidents               — single: { id, action } | bulk: { ids[], action }  [requires operator or admin token]
 *
 * Moderation actions:
 *   action=approve   pending → active    (operator or admin)
 *   action=reject    pending → rejected  (operator or admin)
 *   action=resolve   active  → resolved  (operator or admin)
 *   action=delete    any     → deleted   (admin only)
 */

const CORS = {
  'Access-Control-Allow-Origin':  'https://iloilocity.app',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

const CSV_HEADERS = [
  'id','type','severity','district','address',
  'description','reporter','status','reported_at','resolved_at',
]

// ── Auth helper ──────────────────────────────────────────
async function requireAuth(request, env, allowedRoles = ['admin', 'operator']) {
  if (!env.JWT_SECRET) return null
  const auth  = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const enc    = new TextEncoder()
    const key    = await crypto.subtle.importKey('raw', enc.encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBuf = new Uint8Array(sig.match(/.{2}/g).map((b) => parseInt(b, 16)))
    const valid  = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(`${header}.${body}`))
    if (!valid) return null
    const payload = JSON.parse(atob(body))
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
    if (!allowedRoles.includes(payload.role)) return null
    return payload
  } catch { return null }
}

export async function onRequest(ctx) {
  const { request, env } = ctx
  const url    = new URL(request.url)
  const method = request.method.toUpperCase()

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  // ── GET ───────────────────────────────────────────────
  if (method === 'GET') {
    const status   = url.searchParams.get('status')   ?? null
    const district = url.searchParams.get('district') ?? null
    const type     = url.searchParams.get('type')     ?? null
    const days     = Math.min(parseInt(url.searchParams.get('days') ?? '30') || 30, 365)
    const format   = url.searchParams.get('format')   ?? 'json'

    // Check if caller is admin/operator to decide whether to show pending records
    const caller = await requireAuth(request, env)

    let query  = `SELECT * FROM incidents WHERE reported_at >= datetime('now', '-${days} days')`
    const binds = []

    if (status && status !== 'all') {
      query += ` AND status = ?`; binds.push(status)
    } else if (!caller) {
      // Unauthenticated public view: only show active + resolved (not pending/rejected)
      query += ` AND status IN ('active', 'resolved')`
    }
    if (district) { query += ` AND district = ?`; binds.push(district) }
    if (type)     { query += ` AND type = ?`;     binds.push(type) }

    query += ` ORDER BY reported_at DESC LIMIT 500`

    const { results } = await env.DB.prepare(query).bind(...binds).all()

    // ── CSV export
    if (format === 'csv') {
      const rows = [CSV_HEADERS.join(',')]
      for (const r of results) {
        rows.push(CSV_HEADERS.map((h) => {
          const v = r[h] ?? ''
          return `"${String(v).replace(/"/g, '""')}"`
        }).join(','))
      }
      return new Response(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="incidents_${new Date().toISOString().slice(0,10)}.csv"`,
          'Access-Control-Allow-Origin': 'https://iloilocity.app',
        },
      })
    }

    const summary = {
      total:    results.length,
      active:   results.filter((r) => r.status === 'active').length,
      resolved: results.filter((r) => r.status === 'resolved').length,
      pending:  results.filter((r) => r.status === 'pending').length,
      rejected: results.filter((r) => r.status === 'rejected').length,
      byType:   {},
    }
    for (const r of results) {
      summary.byType[r.type] = (summary.byType[r.type] ?? 0) + 1
    }

    return json({ incidents: results, count: results.length, summary })
  }

  // ── POST (public incident submission — no auth required) ────────────
  if (method === 'POST') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { id, type, severity, district, address, description, reporter, lat, lng } = body
    if (!type || !district || !description)
      return json({ error: 'Missing required fields: type, district, description' }, 400)

    // Authenticated operators/admins submit directly as active
    const caller = await requireAuth(request, env)
    const status = caller ? 'active' : 'pending'

    const incId = id ?? `inc-${Date.now()}`
    await env.DB.prepare(
      `INSERT INTO incidents (id, type, severity, district, address, description, reporter, lat, lng, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(incId, type, severity ?? 'moderate', district,
      address ?? null, description, reporter ?? null,
      lat ?? null, lng ?? null, status).run()

    await writeAudit(env.DB, 'incident_created', 'incidents', incId,
      JSON.stringify({ type, district, severity, status }))

    return json({ success: true, id: incId, status }, 201)
  }

  // ── PATCH (single or bulk) ───────────────────────────────
  if (method === 'PATCH') {
    const caller = await requireAuth(request, env)
    if (!caller) return json({ error: 'Authentication required' }, 401)

    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const action = body.action
    if (!action) return json({ error: 'Missing action' }, 400)

    // Bulk: { ids: [...], action }
    if (Array.isArray(body.ids)) {
      const { ids } = body
      if (ids.length === 0) return json({ error: 'ids array is empty' }, 400)
      if (ids.length > 100) return json({ error: 'Max 100 ids per bulk operation' }, 400)

      const placeholders = ids.map(() => '?').join(',')

      if (action === 'approve') {
        await env.DB.prepare(
          `UPDATE incidents SET status = 'active' WHERE id IN (${placeholders}) AND status = 'pending'`
        ).bind(...ids).run()
        await writeAudit(env.DB, 'incidents_bulk_approved', 'incidents', ids.join(','), JSON.stringify({ count: ids.length }))
        return json({ success: true, affected: ids.length })
      }

      if (action === 'reject') {
        await env.DB.prepare(
          `UPDATE incidents SET status = 'rejected' WHERE id IN (${placeholders}) AND status = 'pending'`
        ).bind(...ids).run()
        await writeAudit(env.DB, 'incidents_bulk_rejected', 'incidents', ids.join(','), JSON.stringify({ count: ids.length }))
        return json({ success: true, affected: ids.length })
      }

      if (action === 'resolve') {
        await env.DB.prepare(
          `UPDATE incidents SET status = 'resolved', resolved_at = datetime('now')
           WHERE id IN (${placeholders})`
        ).bind(...ids).run()
        await writeAudit(env.DB, 'incidents_bulk_resolved', 'incidents', ids.join(','), JSON.stringify({ count: ids.length }))
        return json({ success: true, affected: ids.length })
      }

      if (action === 'delete') {
        if (caller.role !== 'admin') return json({ error: 'Admin role required for bulk delete' }, 403)
        await env.DB.prepare(
          `DELETE FROM incidents WHERE id IN (${placeholders})`
        ).bind(...ids).run()
        await writeAudit(env.DB, 'incidents_bulk_deleted', 'incidents', ids.join(','), JSON.stringify({ count: ids.length }))
        return json({ success: true, affected: ids.length })
      }
    }

    // Single: { id, action }
    const { id } = body
    if (!id) return json({ error: 'Missing id or ids' }, 400)

    if (action === 'approve') {
      await env.DB.prepare(
        `UPDATE incidents SET status = 'active' WHERE id = ? AND status = 'pending'`
      ).bind(id).run()
      await writeAudit(env.DB, 'incident_approved', 'incidents', id, null)
      return json({ success: true })
    }
    if (action === 'reject') {
      await env.DB.prepare(
        `UPDATE incidents SET status = 'rejected' WHERE id = ? AND status = 'pending'`
      ).bind(id).run()
      await writeAudit(env.DB, 'incident_rejected', 'incidents', id, null)
      return json({ success: true })
    }
    if (action === 'resolve') {
      await env.DB.prepare(
        `UPDATE incidents SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?`
      ).bind(id).run()
      await writeAudit(env.DB, 'incident_resolved', 'incidents', id, null)
      return json({ success: true })
    }
    if (action === 'delete') {
      if (caller.role !== 'admin') return json({ error: 'Admin role required for delete' }, 403)
      await env.DB.prepare(`DELETE FROM incidents WHERE id = ?`).bind(id).run()
      await writeAudit(env.DB, 'incident_deleted', 'incidents', id, null)
      return json({ success: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  }

  return json({ error: 'Method not allowed' }, 405)
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(`INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`)
      .bind(action, table_name, String(record_id), details ?? null).run()
  } catch (_) {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
