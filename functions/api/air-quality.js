/**
 * /api/air-quality
 * Source: OpenWeatherMap Air Pollution API (lat/lon — always Iloilo City)
 *
 * WAQI was removed: it has no Iloilo station and snaps to the nearest
 * monitoring station which resolves to Malaysia.
 * OWM uses satellite + model interpolation at exact coordinates.
 *
 * Env vars: OPENWEATHER_API_KEY
 */

const ILOILO_LAT = 10.7202
const ILOILO_LON = 122.5621

const AQI_LABELS = {
  1: { label: 'Good',      color: '#22c55e', advice: 'Air quality is satisfactory — enjoy outdoor activities.' },
  2: { label: 'Fair',      color: '#86efac', advice: 'Acceptable air quality for most people.' },
  3: { label: 'Moderate',  color: '#facc15', advice: 'Sensitive individuals should limit prolonged outdoor exertion.' },
  4: { label: 'Poor',      color: '#f97316', advice: 'Everyone may experience health effects. Reduce outdoor activity.' },
  5: { label: 'Very Poor', color: '#ef4444', advice: 'Health alert — avoid prolonged outdoor activity.' },
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300, s-maxage=300',
}

export async function onRequestGet({ env, request }) {
  const url   = new URL(request.url)
  const debug = url.searchParams.get('debug') === '1'

  if (debug) {
    return new Response(JSON.stringify({
      OPENWEATHER_API_KEY_set: !!env.OPENWEATHER_API_KEY,
      lat: ILOILO_LAT,
      lon: ILOILO_LON,
      note: 'WAQI removed — OWM used exclusively (exact lat/lon, no station snap)',
    }), { headers: CORS })
  }

  if (!env.OPENWEATHER_API_KEY) {
    return new Response(JSON.stringify({
      source: 'static', station: 'Iloilo City',
      aqi: null, scale: null, label: 'Unavailable', color: '#a1a1aa',
      advice: 'Air quality data temporarily unavailable.',
      components: {}, updatedAt: new Date().toISOString(),
      isFallback: true, error: 'OPENWEATHER_API_KEY not configured.',
    }), { headers: CORS })
  }

  try {
    const owmUrl = `https://api.openweathermap.org/data/2.5/air_pollution` +
      `?lat=${ILOILO_LAT}&lon=${ILOILO_LON}&appid=${env.OPENWEATHER_API_KEY}`

    const owmRes = await fetch(owmUrl, {
      headers: { 'User-Agent': 'BantayIloiloCity/1.0' },
    })

    if (!owmRes.ok) {
      const errText = await owmRes.text()
      throw new Error(`OWM HTTP ${owmRes.status}: ${errText.slice(0, 200)}`)
    }

    const owmData = await owmRes.json()
    const item    = owmData.list?.[0]

    if (!item) throw new Error('OWM returned empty list')

    const scale = item.main.aqi          // 1–5 European AQI scale
    const meta  = AQI_LABELS[scale] ?? AQI_LABELS[3]
    const c     = item.components

    // Convert OWM 1-5 scale to approximate US AQI for display
    const AQI_MAP = { 1: 25, 2: 75, 3: 125, 4: 175, 5: 250 }

    return new Response(JSON.stringify({
      source:   'OpenWeatherMap',
      station:  'Iloilo City (10.7202°N, 122.5621°E)',
      aqi:      AQI_MAP[scale] ?? scale * 50,
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
    }), { headers: CORS })

  } catch (err) {
    return new Response(JSON.stringify({
      source: 'static', station: 'Iloilo City',
      aqi: null, scale: null, label: 'Unavailable', color: '#a1a1aa',
      advice: 'Air quality data temporarily unavailable.',
      components: {}, updatedAt: new Date().toISOString(),
      isFallback: true, error: err.message,
    }), { headers: CORS })
  }
}
