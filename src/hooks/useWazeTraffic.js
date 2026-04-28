/**
 * useWazeTraffic — polls /api/waze-traffic every 2 minutes
 * Returns live Waze TVT data for Iloilo City managed area.
 */
import { useState, useEffect, useCallback } from 'react'

const REFRESH_MS = 2 * 60 * 1000 // 2 minutes

const FALLBACK = {
  isFallback:    true,
  totalJamKm:    '—',
  totalWazers:   '—',
  dominantLevel: 0,
  dominantLabel: 'No Data',
  dominantColor: '#6b7280',
  jamBreakdown:  [],
  driversByLevel:[],
  areaName:      'Iloilo City',
  updatedAt:     null,
}

export function useWazeTraffic() {
  const [data,    setData]    = useState(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/waze-traffic')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.isFallback) throw new Error(json.error ?? 'Waze unavailable')
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
      setData(prev => ({ ...FALLBACK, updatedAt: prev.updatedAt }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
