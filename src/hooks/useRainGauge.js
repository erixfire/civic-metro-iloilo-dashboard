/**
 * useRainGauge — fetches rain gauge readings from /api/rain-gauge.
 * Falls back to RAIN_GAUGES mock on error.
 * Fix: uses lastGoodData ref instead of stale state closure.
 */
import { useState, useEffect, useRef } from 'react'
import { RAIN_GAUGES } from '../data/mockData'

const REFRESH_MS = 5 * 60 * 1000 // 5 minutes

export function useRainGauge() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const lastGood              = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchGauges() {
      try {
        const res = await fetch('/api/rain-gauge', { signal: controller.signal })
        if (!res.ok) throw new Error(`Rain gauge API error ${res.status}`)
        const json = await res.json()
        lastGood.current = json
        setData(json)
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e.message)
          // Use last successful data if available, otherwise fall back to mock
          setData(lastGood.current ?? { gauges: RAIN_GAUGES, isFallback: true })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchGauges()
    const interval = setInterval(fetchGauges, REFRESH_MS)
    return () => { controller.abort(); clearInterval(interval) }
  }, [])

  return { data, loading, error }
}
