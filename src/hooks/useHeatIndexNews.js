import { useState, useEffect } from 'react'
import { HEAT_INDEX_NEWS } from '../data/mockData'

const REFRESH_MS = 15 * 60 * 1000 // 15 minutes

export function useHeatIndexNews() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchNews() {
      try {
        const res = await fetch('/api/heat-index-news', { signal: controller.signal })
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') {
          setError(e.message)
          // Keep showing previous data or fall back to static mock
          if (!data) setData({ items: HEAT_INDEX_NEWS, source: 'static fallback', isFallback: true })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
    const interval = setInterval(fetchNews, REFRESH_MS)
    return () => { controller.abort(); clearInterval(interval) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error }
}
