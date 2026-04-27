/**
 * useTide — fetches live tide data from /api/tide.
 * Shared by WeatherCard and TideCard to avoid duplicate fetches.
 * Falls back to TIDE mock on error.
 */
import { useState, useEffect } from 'react'
import { TIDE } from '../data/mockData'

const REFRESH_MS = 60 * 60 * 1000 // 1 hour — PAGASA table is daily

export function useTide() {
  const [tide, setTide]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchTide() {
      try {
        const res = await fetch('/api/tide', { signal: controller.signal })
        if (!res.ok) throw new Error(`Tide API error ${res.status}`)
        const json = await res.json()
        setTide(json)
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e.message)
          setTide(TIDE) // always fall back to mock on error
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTide()
    const interval = setInterval(fetchTide, REFRESH_MS)
    return () => { controller.abort(); clearInterval(interval) }
  }, [])

  return { tide, loading, error }
}
