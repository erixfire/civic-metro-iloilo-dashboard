/**
 * /api/cmc
 * GET  ?type=meetings                  — list all
 * GET  ?type=meeting&id=cmc-005        — single + items + updates
 * POST { type:'meeting', ...fields }   — create new meeting
 * POST { type:'action_item', ...}      — create action item
 * POST { type:'dept_update', ...}      — submit dept update
 * PATCH { type:'meeting', id, status } — update meeting status
 * PATCH { type:'action_item', id, status } — update action item
 */

export async function onRequestGet({ request, env }) {
  const url  = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'meetings'
  const id   = url.searchParams.get('id')
  const H    = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

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
  const H    = { 'Content-Type': 'application/json' }
  const body = await request.json()

  try {
    // ── Create new meeting
    if (body.type === 'meeting') {
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
        presided_by ?? 'Mayor Jerry P. Treñas',
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
  const H    = { 'Content-Type': 'application/json' }
  const body = await request.json()

  try {
    if (body.type === 'meeting' && body.id) {
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

async function writeAudit(DB, action, table_name, record_id, details) {
  try {
    await DB.prepare(`INSERT INTO audit_log (action, table_name, record_id, details) VALUES (?,?,?,?)`)
      .bind(action, table_name, String(record_id), details).run()
  } catch (_) {}
}
