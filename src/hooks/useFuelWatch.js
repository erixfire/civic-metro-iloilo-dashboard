import { useEffect, useState } from 'react'

const API_URL    = '/api/fuel-watch'
const REFRESH_MS = 30 * 60 * 1000 // 30 minutes

export function useFuelWatch() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        const res = await fetch(API_URL, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch fuel data')
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      controller.abort()
      clearInterval(id)
    }
  }, [])

  return { data, loading, error }
}
