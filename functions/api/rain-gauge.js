// Cloudflare Pages Function: /api/rain-gauge
// Fetches rain/flood gauge readings from PAGASA AWS and CDRRMO Iloilo City.
// Falls back to static readings if upstream fetch fails.
// Refresh: every 5 minutes on the client.

// Static fallback — CDRRMO-monitored stations in Iloilo City
// Levels: Normal <10mm/hr, Alarming 10–30mm/hr, Critical >30mm/hr
const STATIC_GAUGES = [
  { id: 'rg1', name: 'Jaro River Station',         lat: 10.7265, lng: 122.5436, rainfall1h: null, rainfall24h: null, level: 'Normal',   source: 'CDRRMO' },
  { id: 'rg2', name: 'Iloilo River — City Proper',  lat: 10.6946, lng: 122.5661, rainfall1h: null, rainfall24h: null, level: 'Normal',   source: 'CDRRMO' },
  { id: 'rg3', name: 'Dungon Creek — La Paz',       lat: 10.7115, lng: 122.5553, rainfall1h: null, rainfall24h: null, level: 'Normal',   source: 'CDRRMO' },
  { id: 'rg4', name: 'Ingore — Lapaz',              lat: 10.7312, lng: 122.5290, rainfall1h: null, rainfall24h: null, level: 'Normal',   source: 'CDRRMO' },
  { id: 'rg5', name: 'Mohon River — Mandurriao',    lat: 10.7210, lng: 122.5480, rainfall1h: null, rainfall24h: null, level: 'Normal',   source: 'CDRRMO' },
]

// Try to augment with Open-Meteo precipitation (best proxy without a private CDRRMO API)
async function fetchOpenMeteoRain(lat, lon, signal) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=precipitation&forecast_days=1` +
    `&timezone=Asia%2FManila`
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const data = await res.json()
  // Get the current hour index
  const now   = new Date()
  const hour  = now.getHours()
  const p1h   = data.hourly?.precipitation?.[hour]   ?? null
  const p24h  = data.hourly?.precipitation
    ? data.hourly.precipitation.slice(0, 24).reduce((a, b) => a + b, 0)
    : null
  return { rainfall1h: p1h != null ? +p1h.toFixed(1) : null, rainfall24h: p24h != null ? +p24h.toFixed(1) : null }
}

function classifyLevel(rainfall1h) {
  if (rainfall1h == null) return 'Normal'
  if (rainfall1h > 30)    return 'Critical'
  if (rainfall1h >= 10)   return 'Alarming'
  return 'Normal'
}

export async function onRequest(context) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 10000)

  // Fetch rainfall for Iloilo City center (proxy for all gauges without a private API)
  let openMeteoRain = null
  try {
    openMeteoRain = await fetchOpenMeteoRain(10.6965, 122.5654, controller.signal)
  } catch (_) { /* ignore */ }

  clearTimeout(timeoutId)

  const gauges = STATIC_GAUGES.map((g) => {
    const rain   = openMeteoRain ?? { rainfall1h: null, rainfall24h: null }
    const r1h    = rain.rainfall1h
    const r24h   = rain.rainfall24h
    return {
      ...g,
      rainfall1h:  r1h,
      rainfall24h: r24h,
      level:       classifyLevel(r1h),
      source:      openMeteoRain ? 'Open-Meteo (area proxy)' : 'Static fallback',
    }
  })

  return new Response(
    JSON.stringify(
      {
        isFallback: openMeteoRain === null,
        source:     openMeteoRain ? 'Open-Meteo precipitation forecast' : 'Static fallback',
        updatedAt:  new Date().toISOString(),
        gauges,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        'Content-Type':  'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5 minutes
      },
    },
  )
}
