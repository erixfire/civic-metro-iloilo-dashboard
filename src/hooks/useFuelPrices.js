/**
 * useFuelPrices — fetches latest fuel prices from /api/fuel-prices (D1)
 * API returns: { asOf, source, iloilo: { gasoline, diesel, kerosene }, philippines: { gasoline, diesel } }
 * Falls back to iloiloFuelConfig static values if D1 is empty or API fails.
 */
import { useState, useEffect, useCallback } from 'react'
import { ILOILO_FUEL } from '../data/iloiloFuelConfig'

function safeNum(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

const FALLBACK = () => ({
  asOf:       ILOILO_FUEL.asOf,
  source:     'static config',
  gasoline:   ILOILO_FUEL.gasoline  ?? { avg: null, min: null, max: null },
  diesel:     ILOILO_FUEL.diesel    ?? { avg: null, min: null, max: null },
  kerosene:   ILOILO_FUEL.kerosene  ?? { avg: null, min: null, max: null },
  phGasoline: null,
  phDiesel:   null,
})

export function useFuelPrices() {
  const [prices,      setPrices]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [fromD1,      setFromD1]      = useState(false)
  const [lastFetched, setLastFetched] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/fuel-prices')

      // 404 = table empty, anything else is an error
      if (r.status === 404) {
        setPrices(FALLBACK()); setFromD1(false)
        setLastFetched(Date.now())
        return
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)

      const d = await r.json()

      // API shape: { asOf, source, iloilo: { gasoline:{avg,min,max}, diesel, kerosene }, philippines: { gasoline, diesel } }
      const iloilo = d.iloilo ?? {}
      const ph     = d.philippines ?? {}

      const gas = iloilo.gasoline ?? {}
      const die = iloilo.diesel   ?? {}
      const ker = iloilo.kerosene ?? {}

      const gasolineAvg = safeNum(gas.avg)
      const dieselAvg   = safeNum(die.avg)
      const keroseneAvg = safeNum(ker.avg)

      // If all three are null the row exists but has no numbers — use static
      if (gasolineAvg === null && dieselAvg === null && keroseneAvg === null) {
        setPrices(FALLBACK()); setFromD1(false)
      } else {
        setPrices({
          asOf:    d.asOf ?? ILOILO_FUEL.asOf,
          source:  d.source ?? 'D1',
          gasoline: {
            avg: gasolineAvg ?? ILOILO_FUEL.gasoline?.avg,
            min: safeNum(gas.min),
            max: safeNum(gas.max),
          },
          diesel: {
            avg: dieselAvg ?? ILOILO_FUEL.diesel?.avg,
            min: safeNum(die.min),
            max: safeNum(die.max),
          },
          kerosene: {
            avg: keroseneAvg ?? ILOILO_FUEL.kerosene?.avg,
            min: safeNum(ker.min),
            max: safeNum(ker.max),
          },
          phGasoline: safeNum(ph.gasoline),
          phDiesel:   safeNum(ph.diesel),
        })
        setFromD1(true)
      }
      setLastFetched(Date.now())
    } catch {
      setPrices(FALLBACK())
      setFromD1(false)
      setLastFetched(Date.now())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [load])

  return { prices, loading, fromD1, lastFetched, refetch: load }
}
