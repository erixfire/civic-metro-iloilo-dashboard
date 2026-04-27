import { useState, useEffect } from 'react'

const ILOILO_LAT = 10.6965
const ILOILO_LON = 122.5654
const REFRESH_MS = 10 * 60 * 1000 // 10 minutes

// PAGASA heat index classification
export function calcHeatIndex(tempC, rh) {
  if (tempC < 27) return { value: tempC, label: 'Normal', cls: 'text-green-500' }
  // Rothfusz equation
  const hi =
    -8.784695 +
    1.61139411 * tempC +
    2.338549 * rh -
    0.14611605 * tempC * rh -
    0.012308094 * tempC ** 2 -
    0.016424828 * rh ** 2 +
    0.002211732 * tempC ** 2 * rh +
    0.00072546 * tempC * rh ** 2 -
    0.000003582 * tempC ** 2 * rh ** 2
  const v = Math.round(hi)
  if (hi < 27) return { value: v, label: 'Normal',           cls: 'text-green-500' }
  if (hi < 33) return { value: v, label: 'Caution',          cls: 'text-yellow-500' }
  if (hi < 42) return { value: v, label: 'Extreme Caution',  cls: 'text-orange-500' }
  if (hi < 52) return { value: v, label: 'Danger',           cls: 'text-red-500' }
  return       { value: v, label: 'Extreme Danger',           cls: 'text-red-700 font-bold' }
}

export function useWeather() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchWeather() {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${ILOILO_LAT}&longitude=${ILOILO_LON}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
          `weather_code,wind_speed_10m,wind_direction_10m,uv_index,precipitation` +
          `&wind_speed_unit=kmh` +
          `&timezone=Asia%2FManila`

        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`)
        const data = await res.json()
        const c = data.current

        const hi = calcHeatIndex(c.temperature_2m, c.relative_humidity_2m)

        setWeather({
          temp:         Math.round(c.temperature_2m),
          feelsLike:    Math.round(c.apparent_temperature),
          humidity:     c.relative_humidity_2m,
          windSpeed:    Math.round(c.wind_speed_10m),
          windDir:      degToCompass(c.wind_direction_10m),
          uvIndex:      Math.round(c.uv_index ?? 0),
          precipitation: c.precipitation ?? 0,
          weatherCode:  c.weather_code,
          condition:    wmoToCondition(c.weather_code),
          heatIndex:    hi.value,
          heatIndexLabel: hi.label,
          heatIndexCls:   hi.cls,
          updatedAt:    c.time,
          source:       'Open-Meteo / WMO',
        })
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
    const interval = setInterval(fetchWeather, REFRESH_MS)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  return { weather, loading, error }
}

function degToCompass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function wmoToCondition(code) {
  if (code === 0)            return 'Clear Sky'
  if (code <= 3)             return 'Partly Cloudy'
  if (code <= 9)             return 'Foggy'
  if (code <= 19)            return 'Drizzle'
  if (code <= 29)            return 'Rain'
  if (code <= 39)            return 'Snow'
  if (code <= 49)            return 'Foggy'
  if (code <= 59)            return 'Drizzle'
  if (code <= 69)            return 'Rain'
  if (code <= 79)            return 'Snow'
  if (code <= 84)            return 'Rain Showers'
  if (code <= 94)            return 'Thunderstorm'
  return 'Heavy Thunderstorm'
}
