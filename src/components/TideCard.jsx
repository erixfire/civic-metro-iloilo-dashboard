import { useState, useEffect } from 'react'
import { TIDE } from '../data/mockData'

const REFRESH_MS = 60 * 60 * 1000 // 1 hour

export default function TideCard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchTide() {
      try {
        const res = await fetch('/api/tide', { signal: controller.signal })
        if (!res.ok) throw new Error(`Tide API error ${res.status}`)
        setData(await res.json())
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTide()
    const interval = setInterval(fetchTide, REFRESH_MS)
    return () => { controller.abort(); clearInterval(interval) }
  }, [])

  const t = data ?? TIDE

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          🌊 Iloilo Port Tide
        </h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
          {error   && <span className="text-[11px] text-amber-500">⚠ mock data</span>}
          {!loading && !error && <span className="text-[11px] text-zinc-400">PAGASA Tide Tables 2026</span>}
        </div>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="tabular text-4xl font-bold text-brand-600 dark:text-brand-400">
            {t.currentLevel ?? TIDE.currentLevel}
            <span className="text-base font-normal ml-1">m</span>
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {t.station ?? t.river ?? 'Iloilo River / Port'}
          </div>
        </div>
        <div className="text-right space-y-1 text-xs text-zinc-500">
          <div>⬆️ High: {t.highTide?.level}m at {t.highTide?.time}</div>
          <div>⬇️ Low:  {t.lowTide?.level}m at  {t.lowTide?.time}</div>
          {t.highTide2 && <div>⬆️ High 2: {t.highTide2.level}m at {t.highTide2.time}</div>}
          {t.lowTide2  && <div>⬇️ Low 2:  {t.lowTide2.level}m  at  {t.lowTide2.time}</div>}
        </div>
      </div>

      {t.datum && (
        <div className="text-[10px] text-zinc-400 border-t border-black/5 dark:border-white/5 pt-2">
          Datum: {t.datum} &nbsp;·&nbsp; Station No. {t.stationNo}
        </div>
      )}
    </div>
  )
}
