/**
 * useForecast — fetches 5-day grouped forecast from /api/forecast
 * Returns { data: { days, city }, loading, error }
 */
import { useState, useEffect } from 'react'

const REFRESH_MS = 30 * 60 * 1000

export function useForecast() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/forecast')
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
    const id = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return { data, loading, error }
}
