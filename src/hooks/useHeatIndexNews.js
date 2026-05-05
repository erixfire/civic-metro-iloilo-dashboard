/**
 * useHeatIndexNews — fetches heat-index-related news from D1 via /api/scrape?source=pagasa
 * Returns { data: { items, isFallback }, loading, error } to match HeatIndexNewsCard expectations.
 */
import { useState, useEffect } from 'react'

const REFRESH_MS = 15 * 60 * 1000 // 15 minutes

export function useHeatIndexNews() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const r = await fetch('/api/scrape?source=pagasa')
        if (!r.ok) throw new Error(`API error ${r.status}`)
        const d = await r.json()
        if (cancelled) return
        const items = (d.items ?? []).map((row) => ({
          id:     row.id ?? row.url ?? row.title,
          title:  row.title,
          url:    row.url ?? '#',
          source: row.source_key ?? 'PAGASA',
          date:   row.pub_date
            ? row.pub_date.slice(0, 10)
            : (row.scraped_at ?? '').slice(0, 10),
          level:   row.level   ?? null,
          summary: row.summary ?? null,
          type:    row.type    ?? 'news',
        }))
        setData({ items, isFallback: false })
        setError(null)
      } catch (e) {
        if (!cancelled) {
          setData({ items: [], isFallback: true })
          setError(e.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return { data, loading, error }
}
