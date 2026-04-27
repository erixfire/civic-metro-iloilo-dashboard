/**
 * /api/cmc — CMC Meetings, Action Items, Dept Updates
 * GET  /api/cmc?type=meetings          — list all meetings
 * GET  /api/cmc?type=meeting&id=cmc-005 — single meeting with items + updates
 * POST /api/cmc  { type:'action_item', ...fields }  — create/update action item
 * POST /api/cmc  { type:'dept_update', ...fields }   — submit dept update
 * PATCH /api/cmc { type:'action_item', id, status }  — update action item status
 */

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url)
  const type   = url.searchParams.get('type') ?? 'meetings'
  const id     = url.searchParams.get('id')
  const DB     = env.DB

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  try {
    if (type === 'meetings') {
      const { results } = await DB.prepare(
        `SELECT * FROM cmc_meetings ORDER BY scheduled_at DESC LIMIT 20`
      ).all()
      return Response.json({ meetings: results }, { headers })
    }

    if (type === 'meeting' && id) {
      const meeting = await DB.prepare(
        `SELECT * FROM cmc_meetings WHERE id = ?`
      ).bind(id).first()

      if (!meeting) return Response.json({ error: 'Not found' }, { status: 404, headers })

      const { results: actionItems } = await DB.prepare(
        `SELECT * FROM cmc_action_items WHERE meeting_id = ? ORDER BY created_at ASC`
      ).bind(id).all()

      const { results: deptUpdates } = await DB.prepare(
        `SELECT * FROM cmc_dept_updates WHERE meeting_id = ? ORDER BY submitted_at ASC`
      ).bind(id).all()

      // Parse agenda JSON
      let agenda = []
      try { agenda = JSON.parse(meeting.agenda ?? '[]') } catch (_) { agenda = [] }

      return Response.json({
        meeting: { ...meeting, agenda },
        actionItems,
        deptUpdates,
      }, { headers })
    }

    return Response.json({ error: 'Invalid type parameter' }, { status: 400, headers })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers })
  }
}

export async function onRequestPost({ request, env }) {
  const DB   = env.DB
  const body = await request.json()
  const headers = { 'Content-Type': 'application/json' }

  try {
    if (body.type === 'action_item') {
      const id = `ai-${Date.now()}`
      await DB.prepare(
        `INSERT OR REPLACE INTO cmc_action_items
         (id, meeting_id, task, assigned_to, due_date, status, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.id ?? id,
        body.meeting_id,
        body.task,
        body.assigned_to,
        body.due_date ?? null,
        body.status ?? 'pending',
        body.remarks ?? null
      ).run()
      return Response.json({ ok: true, id: body.id ?? id }, { headers })
    }

    if (body.type === 'dept_update') {
      await DB.prepare(
        `INSERT OR REPLACE INTO cmc_dept_updates
         (meeting_id, department, update_text, status_flag, submitted_by)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        body.meeting_id,
        body.department,
        body.update_text,
        body.status_flag ?? 'normal',
        body.submitted_by ?? null
      ).run()
      return Response.json({ ok: true }, { headers })
    }

    return Response.json({ error: 'Invalid type' }, { status: 400, headers })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers })
  }
}

export async function onRequestPatch({ request, env }) {
  const DB   = env.DB
  const body = await request.json()
  const headers = { 'Content-Type': 'application/json' }

  try {
    if (body.type === 'action_item' && body.id) {
      await DB.prepare(
        `UPDATE cmc_action_items SET status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(body.status, body.id).run()
      return Response.json({ ok: true }, { headers })
    }
    return Response.json({ error: 'Invalid patch' }, { status: 400, headers })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers })
  }
}
