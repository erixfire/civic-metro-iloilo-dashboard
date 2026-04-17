import { useState, useEffect } from 'react'

const ILOILO_LAT = 10.6965
const ILOILO_LON = 122.5654

export function useWeather() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${ILOILO_LAT}&longitude=${ILOILO_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&wind_speed_unit=kmh&timezone=Asia%2FManila`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('Weather fetch failed')
        const data = await res.json()
        const c = data.current
        setWeather({
          temp: Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          humidity: c.relative_humidity_2m,
          windSpeed: Math.round(c.wind_speed_10m),
          windDir: degToCompass(c.wind_direction_10m),
          uvIndex: c.uv_index,
          weatherCode: c.weather_code,
          condition: wmoToCondition(c.weather_code),
          updatedAt: c.time,
        })
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [])

  return { weather, loading, error }
}

function degToCompass(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

function wmoToCondition(code) {
  if (code === 0) return 'Clear Sky'
  if (code <= 3) return 'Partly Cloudy'
  if (code <= 9) return 'Foggy'
  if (code <= 19) return 'Drizzle'
  if (code <= 29) return 'Rain'
  if (code <= 39) return 'Snow'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Rain Showers'
  if (code <= 94) return 'Thunderstorm'
  return 'Thunderstorm'
}
