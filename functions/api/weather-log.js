/**
 * /api/weather-log
 * GET  ?days=7   — returns hourly averages for last N days (default 7, max 30)
 * POST            — internal: insert a snapshot row (used by cron worker)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300',
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET,POST' } })
  }

  if (request.method === 'GET') {
    const url  = new URL(request.url)
    const days = Math.min(parseInt(url.searchParams.get('days') ?? '7', 10), 30)
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString()

    try {
      const rows = await env.DB.prepare(
        `SELECT
           strftime('%Y-%m-%dT%H:00:00', logged_at) AS hour,
           ROUND(AVG(temp_c), 1)         AS avg_temp,
           ROUND(AVG(humidity_pct), 0)   AS avg_humidity,
           ROUND(AVG(heat_index_c), 1)   AS avg_heat_index,
           ROUND(AVG(aqi), 0)            AS avg_aqi,
           ROUND(AVG(pm25), 1)           AS avg_pm25,
           ROUND(AVG(pm10), 1)           AS avg_pm10,
           ROUND(AVG(uv_index), 1)       AS avg_uv,
           MAX(aqi_label)                AS aqi_label
         FROM weather_log
         WHERE logged_at >= ?
         GROUP BY hour
         ORDER BY hour ASC`
      ).bind(since).all()

      return new Response(JSON.stringify({ rows: rows.results, days }), { headers: CORS })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json()
      await env.DB.prepare(
        `INSERT INTO weather_log
         (logged_at, temp_c, feels_like_c, humidity_pct, wind_speed_kmh, wind_dir,
          uv_index, precipitation, weather_code, heat_index_c, heat_level,
          aqi, aqi_scale, aqi_label, aqi_source, pm25, pm10, o3, no2, source)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        body.logged_at   ?? new Date().toISOString(),
        body.temp_c      ?? null,
        body.feels_like_c ?? null,
        body.humidity_pct ?? null,
        body.wind_speed_kmh ?? null,
        body.wind_dir    ?? null,
        body.uv_index    ?? null,
        body.precipitation ?? null,
        body.weather_code  ?? null,
        body.heat_index_c  ?? null,
        body.heat_level    ?? null,
        body.aqi           ?? null,
        body.aqi_scale     ?? null,
        body.aqi_label     ?? null,
        body.aqi_source    ?? null,
        body.pm25          ?? null,
        body.pm10          ?? null,
        body.o3            ?? null,
        body.no2           ?? null,
        body.source        ?? 'cron'
      ).run()
      return new Response(JSON.stringify({ ok: true }), { headers: CORS })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
