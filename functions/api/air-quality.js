/**
 * /api/air-quality
 * Primary:  WAQI (World Air Quality Index) — Iloilo City station
 * Fallback: OpenWeatherMap Air Pollution API (lat/lon for Iloilo City)
 *
 * Required env vars (Cloudflare Pages secrets):
 *   WAQI_TOKEN          — from https://aqicn.org/data-platform/token/
 *   OPENWEATHER_API_KEY — from https://openweathermap.org/api
 */

const ILOILO_LAT  = 10.7202
const ILOILO_LON  = 122.5621
const WAQI_CITY   = 'iloilo'
const CACHE_SECS  = 1800 // 30 min

const AQI_LABELS = {
  1: { label: 'Good',      color: '#22c55e', advice: 'Air quality is satisfactory.' },
  2: { label: 'Fair',      color: '#86efac', advice: 'Acceptable air quality.' },
  3: { label: 'Moderate',  color: '#facc15', advice: 'Sensitive groups may be affected.' },
  4: { label: 'Poor',      color: '#f97316', advice: 'Everyone may experience health effects.' },
  5: { label: 'Very Poor', color: '#ef4444', advice: 'Health alert — avoid prolonged outdoor activity.' },
}

// Map WAQI AQI number (0-500 US AQI) to 1-5 OWM scale
function waqiToScale(aqi) {
  if (aqi <= 50)  return 1
  if (aqi <= 100) return 2
  if (aqi <= 150) return 3
  if (aqi <= 200) return 4
  return 5
}

export async function onRequestGet({ env, request }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${CACHE_SECS}`,
  }

  try {
    // ── 1. Try WAQI ───────────────────────────────────────────────────────
    if (env.WAQI_TOKEN) {
      const waqiUrl = `https://api.waqi.info/feed/${WAQI_CITY}/?token=${env.WAQI_TOKEN}`
      const waqiRes = await fetch(waqiUrl, { cf: { cacheTtl: CACHE_SECS } })
      if (waqiRes.ok) {
        const waqiData = await waqiRes.json()
        if (waqiData.status === 'ok') {
          const d    = waqiData.data
          const aqi  = d.aqi
          const scale = waqiToScale(aqi)
          const meta  = AQI_LABELS[scale]
          return new Response(JSON.stringify({
            source:   'WAQI',
            station:  d.city?.name ?? 'Iloilo City',
            aqi,
            scale,
            label:    meta.label,
            color:    meta.color,
            advice:   meta.advice,
            components: {
              pm25: d.iaqi?.pm25?.v ?? null,
              pm10: d.iaqi?.pm10?.v ?? null,
              o3:   d.iaqi?.o3?.v   ?? null,
              no2:  d.iaqi?.no2?.v  ?? null,
              so2:  d.iaqi?.so2?.v  ?? null,
              co:   d.iaqi?.co?.v   ?? null,
            },
            updatedAt: d.time?.iso ?? new Date().toISOString(),
            isFallback: false,
          }), { headers: corsHeaders })
        }
      }
    }

    // ── 2. Fallback: OpenWeatherMap ───────────────────────────────────────
    if (env.OPENWEATHER_API_KEY) {
      const owmUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${ILOILO_LAT}&lon=${ILOILO_LON}&appid=${env.OPENWEATHER_API_KEY}`
      const owmRes = await fetch(owmUrl, { cf: { cacheTtl: CACHE_SECS } })
      if (owmRes.ok) {
        const owmData = await owmRes.json()
        const item    = owmData.list?.[0]
        if (item) {
          const scale = item.main.aqi
          const meta  = AQI_LABELS[scale] ?? AQI_LABELS[3]
          const c     = item.components
          return new Response(JSON.stringify({
            source:   'OpenWeatherMap',
            station:  'Iloilo City (lat/lon)',
            aqi:      scale * 50, // approximate US AQI from 1-5 scale
            scale,
            label:    meta.label,
            color:    meta.color,
            advice:   meta.advice,
            components: {
              pm25: c.pm2_5 ?? null,
              pm10: c.pm10  ?? null,
              o3:   c.o3    ?? null,
              no2:  c.no2   ?? null,
              so2:  c.so2   ?? null,
              co:   c.co    ?? null,
            },
            updatedAt:  new Date(item.dt * 1000).toISOString(),
            isFallback: false,
          }), { headers: corsHeaders })
        }
      }
    }

    // ── 3. Static fallback ────────────────────────────────────────────────
    return new Response(JSON.stringify({
      source: 'static',
      station: 'Iloilo City',
      aqi: null,
      scale: null,
      label: 'Unavailable',
      color: '#a1a1aa',
      advice: 'Air quality data temporarily unavailable.',
      components: {},
      updatedAt: new Date().toISOString(),
      isFallback: true,
      error: 'No API keys configured. Set WAQI_TOKEN or OPENWEATHER_API_KEY in Cloudflare secrets.',
    }), { headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, isFallback: true }), {
      status: 500,
      headers: corsHeaders,
    })
  }
}
