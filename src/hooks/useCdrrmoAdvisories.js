import { useState, useEffect } from 'react'

const REFRESH_MS = 20 * 60 * 1000 // 20 minutes

export function useCdrrmoAdvisories() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchAdvisories() {
      try {
        const res = await fetch('/api/cdrrmo-advisories', { signal: controller.signal })
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAdvisories()
    const interval = setInterval(fetchAdvisories, REFRESH_MS)
    return () => { controller.abort(); clearInterval(interval) }
  }, [])

  return { data, loading, error }
}
