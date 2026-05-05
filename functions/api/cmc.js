/**
 * /api/cmc
 * GET    ?type=meetings                   — list all
 * GET    ?type=meeting&id=cmc-005         — single + items + updates
 * POST   { type:'meeting', ...fields }    — create new meeting         [admin]
 * POST   { type:'action_item', ...}       — create action item         [operator|admin]
 * POST   { type:'dept_update', ...}       — submit dept update         [operator|admin]
 * PATCH  { type:'meeting', id, status }   — update meeting status      [admin]
 * PATCH  { type:'action_item', id, status } — update action item       [operator|admin]
 * PUT    { type:'meeting', id, ...fields} — edit all meeting fields    [admin]
 * DELETE ?type=meeting&id=cmc-005         — delete meeting + cascade   [admin]
 */

const CORS = {
  'Access-Control-Allow-Origin':  'https://iloilocity.app',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type':                 'application/json',
}

// ── Auth helper ────────────────────────────────────────────────────
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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestGet({ request, env }) {
  const url  = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'meetings'
  const id   = url.searchParams.get('id')
  const H    = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://iloilocity.app' }

  try {
    if (type === 'meetings') {
      const { results } = await env.DB.prepare(
        `SELECT * FROM cmc_meetings ORDER BY scheduled_at DESC LIMIT 20`
      ).all()
      return Response.json({ meetings: results }, { headers: H })
    }

    if (type === 'meeting' && id) {
      const meeting = await env.DB.prepare(
        `SELECT * FROM cmc_meetings WHERE id = ?`
      ).bind(id).first()
      if (!meeting) return Response.json({ error: 'Not found' }, { status: 404, headers: H })

      const { results: actionItems } = await env.DB.prepare(
        `SELECT * FROM cmc_action_items WHERE meeting_id = ? ORDER BY created_at ASC`
      ).bind(id).all()
      const { results: deptUpdates } = await env.DB.prepare(
        `SELECT * FROM cmc_dept_updates WHERE meeting_id = ? ORDER BY submitted_at ASC`
      ).bind(id).all()

      let agenda = []
      try { agenda = JSON.parse(meeting.agenda ?? '[]') } catch (_) {}

      return Response.json({ meeting: { ...meeting, agenda }, actionItems, deptUpdates }, { headers: H })
    }

    return Response.json({ error: 'Invalid type' }, { status: 400, headers: H })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: H })
  }
}

export async function onRequestPost({ request, env }) {
  const caller = await requireAuth(request, env)
  if (!caller) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS })

  const H    = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://iloilocity.app' }
  const body = await request.json()

  try {
    // ── Create new meeting (admin only)
    if (body.type === 'meeting') {
      if (caller.role !== 'admin') return new Response(JSON.stringify({ error: 'Admin role required' }), { status: 403, headers: CORS })
      const { meeting_no, title, scheduled_at, venue, presided_by, agenda } = body
      if (!meeting_no || !scheduled_at) return Response.json({ error: 'meeting_no and scheduled_at required' }, { status: 400, headers: H })
      const id = `cmc-${String(meeting_no).padStart(3, '0')}`
      await env.DB.prepare(
        `INSERT OR IGNORE INTO cmc_meetings (id, meeting_no, title, scheduled_at, venue, presided_by, agenda)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, meeting_no,
        title       ?? `CMC Meeting #${meeting_no}`,
        scheduled_at,
        venue       ?? 'CMO Conference Room',
        presided_by ?? 'Mayor Raisa P. Treñas',
        agenda      ? JSON.stringify(agenda) : null
      ).run()
      await writeAudit(env.DB, 'cmc_meeting_created', 'cmc_meetings', id, JSON.stringify({ meeting_no, scheduled_at }))
      return Response.json({ ok: true, id }, { headers: H })
    }

    // ── Create action item
    if (body.type === 'action_item') {
      const id = body.id ?? `ai-${Date.now()}`
      await env.DB.prepare(
        `INSERT OR REPLACE INTO cmc_action_items
         (id, meeting_id, task, assigned_to, due_date, status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, body.meeting_id, body.task, body.assigned_to, body.due_date ?? null, body.status ?? 'pending', body.remarks ?? null).run()
      return Response.json({ ok: true, id }, { headers: H })
    }

    // ── Dept update
    if (body.type === 'dept_update') {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO cmc_dept_updates
         (meeting_id, department, update_text, status_flag, submitted_by)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(body.meeting_id, body.department, body.update_text, body.status_flag ?? 'normal', body.submitted_by ?? null).run()
      return Response.json({ ok: true }, { headers: H })
    }

    return Response.json({ error: 'Invalid type' }, { status: 400, headers: H })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: H })
  }
}

export async function onRequestPatch({ request, env }) {
  const caller = await requireAuth(request, env)
  if (!caller) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS })

  const H    = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://iloilocity.app' }
  const body = await request.json()

  try {
    if (body.type === 'meeting' && body.id) {
      if (caller.role !== 'admin') return new Response(JSON.stringify({ error: 'Admin role required' }), { status: 403, headers: CORS })
      await env.DB.prepare(
        `UPDATE cmc_meetings SET status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(body.status, body.id).run()
      return Response.json({ ok: true }, { headers: H })
    }
    if (body.type === 'action_item' && body.id) {
      await env.DB.prepare(
        `UPDATE cmc_action_items SET status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(body.status, body.id).run()
      return Response.json({ ok: true }, { headers: H })
    }
    return Response.json({ error: 'Invalid patch' }, { status: 400, headers: H })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: H })
  }
}

// ── PUT — full edit of a meeting's fields [admin] ──────────────────
export async function onRequestPut({ request, env }) {
  const caller = await requireAuth(request, env, ['admin'])
  if (!caller) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS })

  const H    = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://iloilocity.app' }
  const body = await request.json()

  try {
    if (body.type === 'meeting' && body.id) {
      const { id, title, scheduled_at, venue, presided_by, agenda, notes, status } = body

      // Fetch existing so we only overwrite provided fields
      const existing = await env.DB.prepare(`SELECT * FROM cmc_meetings WHERE id = ?`).bind(id).first()
      if (!existing) return Response.json({ error: 'Meeting not found' }, { status: 404, headers: H })

      await env.DB.prepare(`
        UPDATE cmc_meetings
        SET
          title        = ?,
          scheduled_at = ?,
          venue        = ?,
          presided_by  = ?,
          agenda       = ?,
          notes        = ?,
          status       = ?,
          updated_at   = datetime('now')
        WHERE id = ?
      `).bind(
        title        ?? existing.title,
        scheduled_at ?? existing.scheduled_at,
        venue        ?? existing.venue,
        presided_by  ?? existing.presided_by,
        agenda       !== undefined ? JSON.stringify(agenda) : existing.agenda,
        notes        !== undefined ? notes : existing.notes,
        status       ?? existing.status,
        id
      ).run()

      await writeAudit(env.DB, 'cmc_meeting_edited', 'cmc_meetings', id,
        JSON.stringify({ edited_by: caller.username, fields: Object.keys(body).filter(k => k !== 'type' && k !== 'id') }))

      return Response.json({ ok: true }, { headers: H })
    }

    return Response.json({ error: 'Invalid type or missing id' }, { status: 400, headers: H })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: H })
  }
}

// ── DELETE — remove meeting + cascade [admin] ──────────────────────
export async function onRequestDelete({ request, env }) {
  const caller = await requireAuth(request, env, ['admin'])
  if (!caller) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: CORS })

  const H   = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://iloilocity.app' }
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const id   = url.searchParams.get('id')

  try {
    if (type === 'meeting' && id) {
      const existing = await env.DB.prepare(`SELECT id FROM cmc_meetings WHERE id = ?`).bind(id).first()
      if (!existing) return Response.json({ error: 'Meeting not found' }, { status: 404, headers: H })

      // CASCADE on FK handles action_items + dept_updates automatically
      await env.DB.prepare(`DELETE FROM cmc_meetings WHERE id = ?`).bind(id).run()

      await writeAudit(env.DB, 'cmc_meeting_deleted', 'cmc_meetings', id,
        JSON.stringify({ deleted_by: caller.username }))

      return Response.json({ ok: true }, { headers: H })
    }

    if (type === 'action_item' && id) {
      await env.DB.prepare(`DELETE FROM cmc_action_items WHERE id = ?`).bind(id).run()
      await writeAudit(env.DB, 'cmc_action_item_deleted', 'cmc_action_items', id,
        JSON.stringify({ deleted_by: caller.username }))
      return Response.json({ ok: true }, { headers: H })
    }

    return Response.json({ error: 'Invalid type or missing id' }, { status: 400, headers: H })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: H })
  }
}

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(`INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`)
      .bind(action, table_name, String(record_id), details).run()
  } catch (_) {}
}
