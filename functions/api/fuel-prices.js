/**
 * GET  /api/fuel-prices     — latest Iloilo fuel prices from D1
 * POST /api/fuel-prices     — log a new fuel price entry (operator)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

export async function onRequest(ctx) {
  const { request, env } = ctx
  const method = request.method.toUpperCase()

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  if (method === 'GET') {
    const latest = await env.DB.prepare(
      `SELECT * FROM fuel_prices ORDER BY as_of DESC LIMIT 1`
    ).first()

    if (!latest) return json({ error: 'No fuel price data' }, 404)

    // Return in the shape useFuelWatch expects
    return json({
      asOf: latest.as_of,
      source: latest.source,
      iloilo: {
        gasoline: { avg: latest.iloilo_gasoline_avg, min: latest.iloilo_gasoline_min, max: latest.iloilo_gasoline_max },
        diesel:   { avg: latest.iloilo_diesel_avg,   min: latest.iloilo_diesel_min,   max: latest.iloilo_diesel_max },
        kerosene: { avg: latest.iloilo_kerosene_avg, min: latest.iloilo_kerosene_min, max: latest.iloilo_kerosene_max },
      },
      philippines: {
        gasoline: latest.ph_gasoline_avg,
        diesel:   latest.ph_diesel_avg,
      },
    })
  }

  if (method === 'POST') {
    let body
    try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const {
      as_of,
      iloilo_gasoline_avg, iloilo_gasoline_min, iloilo_gasoline_max,
      iloilo_diesel_avg,   iloilo_diesel_min,   iloilo_diesel_max,
      iloilo_kerosene_avg, iloilo_kerosene_min, iloilo_kerosene_max,
      ph_gasoline_avg,     ph_diesel_avg,       logged_by,
    } = body

    if (!as_of) return json({ error: 'as_of date is required' }, 400)

    await env.DB.prepare(
      `INSERT INTO fuel_prices (
         as_of,
         iloilo_gasoline_avg, iloilo_gasoline_min, iloilo_gasoline_max,
         iloilo_diesel_avg,   iloilo_diesel_min,   iloilo_diesel_max,
         iloilo_kerosene_avg, iloilo_kerosene_min, iloilo_kerosene_max,
         ph_gasoline_avg,     ph_diesel_avg,       logged_by
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(as_of) DO UPDATE SET
         iloilo_gasoline_avg = excluded.iloilo_gasoline_avg,
         iloilo_diesel_avg   = excluded.iloilo_diesel_avg,
         ph_gasoline_avg     = excluded.ph_gasoline_avg`
    ).bind(
      as_of,
      iloilo_gasoline_avg ?? null, iloilo_gasoline_min ?? null, iloilo_gasoline_max ?? null,
      iloilo_diesel_avg   ?? null, iloilo_diesel_min   ?? null, iloilo_diesel_max   ?? null,
      iloilo_kerosene_avg ?? null, iloilo_kerosene_min ?? null, iloilo_kerosene_max ?? null,
      ph_gasoline_avg     ?? null, ph_diesel_avg       ?? null, logged_by           ?? null
    ).run()

    return json({ success: true }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS })
}
