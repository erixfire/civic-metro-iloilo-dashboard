/**
 * useHeatIndexNews — fetches heat index news from /api/heat-index-news
 * Falls back to HEAT_INDEX_NEWS mock on failure.
 */
import { useState, useEffect } from 'react'
import { HEAT_INDEX_NEWS as MOCK } from '../data/mockData'

export function useHeatIndexNews() {
  const [news,    setNews]    = useState(MOCK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/heat-index-news')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setNews(d.items?.length > 0 ? d.items : MOCK) })
      .catch(() => { if (!cancelled) setNews(MOCK) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { news, loading }
}
