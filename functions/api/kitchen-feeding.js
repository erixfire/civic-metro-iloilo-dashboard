/**
 * GET  /api/kitchen-feeding          — last 14 days log + today site breakdown + totals
 * POST /api/kitchen-feeding          — add a new daily log entry
 * GET  /api/kitchen-feeding/sites    — list all kitchen sites
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

export async function onRequest(ctx) {
  const { request, env } = ctx
  const url    = new URL(request.url)
  const method = request.method.toUpperCase()

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  // --- GET /api/kitchen-feeding/sites ---
  if (method === 'GET' && url.pathname.endsWith('/sites')) {
    const { results } = await env.DB.prepare(
      `SELECT * FROM kitchen_sites WHERE is_active = 1 ORDER BY name`
    ).all()
    return json({ sites: results })
  }

  // --- GET /api/kitchen-feeding ---
  if (method === 'GET') {
    const days = parseInt(url.searchParams.get('days') ?? '14')

    // Active program
    const program = await env.DB.prepare(
      `SELECT * FROM kitchen_programs WHERE is_active = 1 ORDER BY start_date DESC LIMIT 1`
    ).first()

    if (!program) return json({ error: 'No active program found' }, 404)

    // Last N days log
    const { results: log } = await env.DB.prepare(
      `SELECT * FROM kitchen_feeding_log
       WHERE program_id = ?
       ORDER BY log_date DESC
       LIMIT ?`
    ).bind(program.id, days).all()

    // Reverse so charts go oldest → newest
    log.reverse()

    // Today's site breakdown
    const today      = log[log.length - 1]
    let siteBreakdown = []
    if (today) {
      const { results: sites } = await env.DB.prepare(
        `SELECT ksl.*, ks.name as site_name, ks.barangay
         FROM kitchen_site_log ksl
         JOIN kitchen_sites ks ON ks.id = ksl.site_id
         WHERE ksl.log_id = ?
         ORDER BY ksl.families DESC`
      ).bind(today.id).all()
      siteBreakdown = sites
    }

    // Cumulative totals
    const totals = await env.DB.prepare(
      `SELECT
         SUM(families)    AS total_families,
         SUM(individuals) AS total_individuals,
         COUNT(*)         AS total_days
       FROM kitchen_feeding_log
       WHERE program_id = ?`
    ).bind(program.id).first()

    return json({ program, log, today, siteBreakdown, totals })
  }

  // --- POST /api/kitchen-feeding ---
  if (method === 'POST') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { program_id, log_date, families, individuals, sites_active, meals, remarks, logged_by } = body
    if (!program_id || !log_date || families == null || individuals == null)
      return json({ error: 'Missing required fields: program_id, log_date, families, individuals' }, 400)

    const result = await env.DB.prepare(
      `INSERT INTO kitchen_feeding_log
         (program_id, log_date, families, individuals, sites_active, meals, remarks, logged_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(program_id, log_date) DO UPDATE SET
         families    = excluded.families,
         individuals = excluded.individuals,
         sites_active= excluded.sites_active,
         meals       = excluded.meals,
         remarks     = excluded.remarks,
         logged_by   = excluded.logged_by`
    ).bind(
      program_id, log_date,
      Number(families), Number(individuals),
      Number(sites_active ?? 0), meals ?? 'Lunch & Merienda',
      remarks ?? null, logged_by ?? null
    ).run()

    return json({ success: true, meta: result.meta }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
