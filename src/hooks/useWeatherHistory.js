/**
 * useWeatherHistory — fetches hourly weather+AQI history from D1
 * Returns { data: { rows, days }, loading, error }
 */
import { useState, useEffect } from 'react'

export function useWeatherHistory(days = 7) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const r = await fetch(`/api/weather-log?days=${days}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        if (!cancelled) { setData(d); setError(null) }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
  }, [days])

  return { data, loading, error }
}
