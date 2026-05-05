/**
 * useAirQuality — fetches AQI data from /api/air-quality
 * Returns { data, loading, error }
 */
import { useState, useEffect } from 'react'

const REFRESH_MS = 30 * 60 * 1000 // 30 min

export function useAirQuality() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const r = await fetch('/api/air-quality')
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
