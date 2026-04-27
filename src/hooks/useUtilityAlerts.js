/**
 * useUtilityAlerts — fetches active utility alerts from D1 via /api/utility-alerts
 * Falls back to UTILITY_ALERTS mock if API unavailable.
 */
import { useState, useEffect, useCallback } from 'react'
import { UTILITY_ALERTS as MOCK } from '../data/mockData'

export function useUtilityAlerts() {
  const [alerts,     setAlerts]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [fromD1,     setFromD1]     = useState(false)
  const [lastFetched, setLastFetched] = useState(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/utility-alerts')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const live = data.alerts ?? []

      if (live.length > 0) {
        // Normalise D1 rows to match widget expectations
        setAlerts(live.map((a) => ({
          id:       a.id,
          type:     a.type === 'outage' || a.type === 'maintenance' ? 'power' : 'water',
          provider: a.provider,
          severity: a.severity,
          title:    a.title,
          areas:    a.areas ? a.areas.split(',').map((s) => s.trim()) : [],
          date:     a.start_dt ? a.start_dt.split('T')[0] : '',
          timeFrom: a.start_dt ? a.start_dt.split('T')[1]?.slice(0,5) : '',
          timeTo:   a.end_dt   ? a.end_dt.split('T')[1]?.slice(0,5)   : '',
          reason:   a.reason ?? '',
          contactNo: '',
        })))
        setFromD1(true)
      } else {
        // D1 table is empty — show mock data so widget isn’t blank
        setAlerts(MOCK)
        setFromD1(false)
      }
      setLastFetched(Date.now())
    } catch (e) {
      setError(e.message)
      setAlerts(MOCK)
      setFromD1(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    // Auto-refresh every 5 minutes
    const t = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchAlerts])

  return { alerts, loading, error, fromD1, lastFetched, refetch: fetchAlerts }
}
