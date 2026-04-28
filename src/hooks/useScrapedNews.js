/**
 * useScrapedNews — fetches aggregated scraped news from /api/scrape
 * source: 'all' | 'fuel' | 'more' | 'mcwd' | 'pagasa' | 'cdrrmo' | 'news'
 */
import { useState, useEffect } from 'react'

export function useScrapedNews(source = 'all') {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [meta,    setMeta]    = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/scrape?source=${encodeURIComponent(source)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setItems(d.items ?? [])
        setMeta({ count: d.count, updatedAt: d.updatedAt })
        setError(null)
      })
      .catch(e => {
        if (cancelled) return
        setError(e.message)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [source])

  return { items, loading, error, meta }
}
