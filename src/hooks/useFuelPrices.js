/**
 * useFuelPrices — fetches latest fuel prices from /api/fuel-prices (D1)
 * API shape: { asOf, source, iloilo: { gasoline, diesel, kerosene }, philippines: { gasoline, diesel } }
 *
 * If D1 is empty (404) or all values are null, automatically seeds D1 with
 * the static iloiloFuelConfig values so future GETs return real data.
 * Falls back to static config for display in the meantime.
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

/** Seed D1 with static config prices so the card shows real data immediately */
async function seedD1() {
  try {
    const f = ILOILO_FUEL
    await fetch('/api/fuel-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        as_of:               f.asOf ?? new Date().toISOString().split('T')[0],
        iloilo_gasoline_avg: f.gasoline?.avg  ?? null,
        iloilo_gasoline_min: f.gasoline?.min  ?? null,
        iloilo_gasoline_max: f.gasoline?.max  ?? null,
        iloilo_diesel_avg:   f.diesel?.avg    ?? null,
        iloilo_diesel_min:   f.diesel?.min    ?? null,
        iloilo_diesel_max:   f.diesel?.max    ?? null,
        iloilo_kerosene_avg: f.kerosene?.avg  ?? null,
        iloilo_kerosene_min: f.kerosene?.min  ?? null,
        iloilo_kerosene_max: f.kerosene?.max  ?? null,
        ph_gasoline_avg:     null,
        ph_diesel_avg:       null,
        source:              'LPCC · Static Seed',
        logged_by:           'auto-seed',
      }),
    })
    console.log('[useFuelPrices] D1 seeded from static iloiloFuelConfig')
  } catch (e) {
    console.warn('[useFuelPrices] D1 seed failed:', e)
  }
}

export function useFuelPrices() {
  const [prices,      setPrices]      = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [fromD1,      setFromD1]      = useState(false)
  const [lastFetched, setLastFetched] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/fuel-prices')

      if (r.status === 404) {
        // D1 table is empty — seed it and show static fallback
        seedD1()
        setPrices(FALLBACK())
        setFromD1(false)
        setLastFetched(Date.now())
        return
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)

      const d = await r.json()

      const iloilo = d.iloilo ?? {}
      const ph     = d.philippines ?? {}

      const gas = iloilo.gasoline ?? {}
      const die = iloilo.diesel   ?? {}
      const ker = iloilo.kerosene ?? {}

      const gasolineAvg = safeNum(gas.avg)
      const dieselAvg   = safeNum(die.avg)
      const keroseneAvg = safeNum(ker.avg)

      // All nulls means row exists but sync hasn't written prices yet — seed and use static
      if (gasolineAvg === null && dieselAvg === null && keroseneAvg === null) {
        seedD1()
        setPrices(FALLBACK())
        setFromD1(false)
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [load])

  return { prices, loading, fromD1, lastFetched, refetch: load }
}
