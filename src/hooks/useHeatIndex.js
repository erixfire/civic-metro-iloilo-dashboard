/**
 * useHeatIndex — fetches latest heat index readings from D1 via /api/heat-index
 * Falls back to HEAT_INDEX_ILOILO mock if D1 table is empty or API fails.
 */
import { useState, useEffect, useCallback } from 'react'
import { HEAT_INDEX_ILOILO as MOCK } from '../data/mockData'

const LEVEL_MAP = [
  { min: 52, label: 'Extreme Danger',  color: 'text-red-800',    bg: 'bg-red-100 dark:bg-red-950/60' },
  { min: 42, label: 'Danger',          color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/40' },
  { min: 33, label: 'Extreme Caution', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  { min: 27, label: 'Caution',         color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/40' },
  { min: 0,  label: 'Normal',          color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/40' },
]

const LEVEL_NOTE = {
  'Extreme Danger':  'Heat stroke highly likely. Avoid all outdoor exertion.',
  'Danger':          'Heat cramps/exhaustion likely; heat stroke possible.',
  'Extreme Caution': 'Heat cramps/exhaustion possible with prolonged activity.',
  'Caution':         'Fatigue possible; watch for heat cramps.',
  'Normal':          'No significant heat risk for most individuals.',
}

function classifyHI(hiC) {
  for (const row of LEVEL_MAP) {
    if (hiC >= row.min) return row
  }
  return LEVEL_MAP[LEVEL_MAP.length - 1]
}

export function useHeatIndex() {
  const [readings,    setReadings]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [fromD1,      setFromD1]      = useState(false)
  const [lastFetched, setLastFetched] = useState(null)

  const fetchReadings = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/heat-index')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const live = data.readings ?? []

      if (live.length > 0) {
        // Group by area — keep latest per area
        const byArea = {}
        for (const row of live) {
          if (!byArea[row.area] || row.log_date > byArea[row.area].log_date) {
            byArea[row.area] = row
          }
        }
        const classified = Object.values(byArea).map((row) => {
          const cls = classifyHI(row.heat_index_c)
          return {
            area:       row.area,
            hiC:        row.heat_index_c,
            level:      row.level ?? cls.label,
            levelColor: cls.color,
            bg:         cls.bg,
            note:       LEVEL_NOTE[row.level ?? cls.label] ?? '',
            log_date:   row.log_date,
          }
        }).sort((a, b) => b.hiC - a.hiC)

        setReadings(classified)
        setFromD1(true)
      } else {
        setReadings(MOCK)
        setFromD1(false)
      }
      setLastFetched(Date.now())
    } catch {
      setReadings(MOCK)
      setFromD1(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReadings()
    const t = setInterval(fetchReadings, 10 * 60 * 1000) // refresh every 10 min
    return () => clearInterval(t)
  }, [fetchReadings])

  return { readings, loading, fromD1, lastFetched, refetch: fetchReadings }
}
