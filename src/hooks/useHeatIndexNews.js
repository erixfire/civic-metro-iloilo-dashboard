/**
 * useHeatIndexNews — fetches heat-index-related news from D1 via /api/scrape?source=pagasa
 * Maps D1 scraped_news row fields to the shape expected by HeatIndexCard.
 * Falls back to an empty array (no stale mock data) on failure.
 */
import { useState, useEffect } from 'react'

export function useHeatIndexNews() {
  const [news,    setNews]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch('/api/scrape?source=pagasa')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const items = (d.items ?? []).map((row) => ({
          id:     row.id ?? row.url ?? row.title,
          title:  row.title,
          url:    row.url   ?? '#',
          source: row.source_key ?? 'PAGASA',
          date:   row.pub_date
            ? row.pub_date.slice(0, 10)   // show YYYY-MM-DD
            : (row.scraped_at ?? '').slice(0, 10),
        }))
        setNews(items)
      })
      .catch(() => { if (!cancelled) setNews([]) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  return { news, loading }
}
