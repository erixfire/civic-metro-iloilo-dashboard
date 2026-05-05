/**
 * /api/forecast
 * OpenWeatherMap 5-day / 3-hour forecast for Iloilo City
 * Returns grouped daily summaries + raw 3-hour slots for today
 */

const ILOILO_LAT = 10.7202
const ILOILO_LON = 122.5621

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=1800, s-maxage=1800',
}

const WMO_ICON = {
  '01d': '☀️', '01n': '🌙',
  '02d': '🌤️', '02n': '⛅',
  '03d': '⛅',   '03n': '⛅',
  '04d': '☁️',  '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️',  '11n': '⛈️',
  '13d': '🌨️', '13n': '🌨️',
  '50d': '🌫️', '50n': '🌫️',
}

export async function onRequestGet({ env }) {
  if (!env.OPENWEATHER_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENWEATHER_API_KEY not set', isFallback: true }), { headers: CORS })
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${ILOILO_LAT}&lon=${ILOILO_LON}&appid=${env.OPENWEATHER_API_KEY}&units=metric&cnt=40`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OWM HTTP ${res.status}`)
    const raw = await res.json()

    // Group into days
    const byDay = {}
    for (const slot of raw.list) {
      const day = slot.dt_txt.slice(0, 10)
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(slot)
    }

    const days = Object.entries(byDay).map(([date, slots]) => {
      const temps = slots.map((s) => s.main.temp)
      const pops  = slots.map((s) => s.pop ?? 0)
      const noon  = slots.find((s) => s.dt_txt.includes('12:00')) ?? slots[Math.floor(slots.length / 2)]
      return {
        date,
        dayLabel: new Date(date + 'T12:00:00+08:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
        tempMin:  Math.round(Math.min(...temps)),
        tempMax:  Math.round(Math.max(...temps)),
        rainPct:  Math.round(Math.max(...pops) * 100),
        condition: noon.weather[0].description,
        icon:     WMO_ICON[noon.weather[0].icon] ?? '🌤️',
        iconCode: noon.weather[0].icon,
        humidity: Math.round(noon.main.humidity),
        windSpeed: Math.round(noon.wind.speed * 3.6), // m/s to km/h
        slots: slots.map((s) => ({
          time:     s.dt_txt.slice(11, 16),
          temp:     Math.round(s.main.temp),
          rainPct:  Math.round((s.pop ?? 0) * 100),
          icon:     WMO_ICON[s.weather[0].icon] ?? '🌤️',
          condition: s.weather[0].description,
        })),
      }
    })

    return new Response(JSON.stringify({ days, city: raw.city?.name ?? 'Iloilo City', isFallback: false }), { headers: CORS })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, isFallback: true }), { status: 500, headers: CORS })
  }
}
