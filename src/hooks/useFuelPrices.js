/**
 * useFuelPrices — fetches latest fuel prices from /api/fuel-prices (D1)
 * Falls back to iloiloFuelConfig static values if D1 table is empty or API fails.
 */
import { useState, useEffect, useCallback } from 'react'
import { ILOILO_FUEL } from '../data/iloiloFuelConfig'

function safeNum(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export function useFuelPrices() {
  const [prices,     setPrices]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [fromD1,     setFromD1]     = useState(false)
  const [lastFetched,setLastFetched] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/fuel-prices')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()

      // GET /api/fuel-prices returns { prices: [...] } sorted by as_of DESC
      const latest = d.prices?.[0] ?? null

      if (latest) {
        setPrices({
          asOf:    latest.as_of ?? ILOILO_FUEL.asOf,
          gasoline: {
            avg: safeNum(latest.iloilo_gasoline_avg) ?? ILOILO_FUEL.gasoline?.avg,
            min: safeNum(latest.iloilo_gasoline_min),
            max: safeNum(latest.iloilo_gasoline_max),
          },
          diesel: {
            avg: safeNum(latest.iloilo_diesel_avg)   ?? ILOILO_FUEL.diesel?.avg,
            min: safeNum(latest.iloilo_diesel_min),
            max: safeNum(latest.iloilo_diesel_max),
          },
          kerosene: {
            avg: safeNum(latest.iloilo_kerosene_avg) ?? ILOILO_FUEL.kerosene?.avg,
            min: null,
            max: null,
          },
          phGasoline: safeNum(latest.ph_gasoline_avg),
          phDiesel:   safeNum(latest.ph_diesel_avg),
        })
        setFromD1(true)
      } else {
        // D1 table empty — use static config
        setPrices({
          asOf:       ILOILO_FUEL.asOf,
          gasoline:   ILOILO_FUEL.gasoline  ?? { avg: null, min: null, max: null },
          diesel:     ILOILO_FUEL.diesel    ?? { avg: null, min: null, max: null },
          kerosene:   ILOILO_FUEL.kerosene  ?? { avg: null, min: null, max: null },
          phGasoline: null,
          phDiesel:   null,
        })
        setFromD1(false)
      }
      setLastFetched(Date.now())
    } catch {
      setPrices({
        asOf:       ILOILO_FUEL.asOf,
        gasoline:   ILOILO_FUEL.gasoline  ?? { avg: null, min: null, max: null },
        diesel:     ILOILO_FUEL.diesel    ?? { avg: null, min: null, max: null },
        kerosene:   ILOILO_FUEL.kerosene  ?? { avg: null, min: null, max: null },
        phGasoline: null,
        phDiesel:   null,
      })
      setFromD1(false)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30 * 60 * 1000) // refresh every 30 min
    return () => clearInterval(t)
  }, [load])

  return { prices, loading, fromD1, lastFetched, refetch: load }
}
