import { useEffect, useState } from 'react'

const API_URL = '/api/fuel-watch'

export function useFuelWatch() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(API_URL, { headers: { Accept: 'application/json' } })
        if (!res.ok) throw new Error('Failed to fetch fuel data')
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 30 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { data, loading, error }
}
