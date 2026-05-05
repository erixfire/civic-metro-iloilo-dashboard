import { useState, useCallback } from 'react'

/**
 * useGeolocation — wraps the browser Geolocation API.
 * Returns coords { lat, lng, accuracy }, status, error, and a request() trigger.
 */
export default function useGeolocation() {
  const [coords, setCoords] = useState(null)   // { lat, lng, accuracy }
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error,  setError]  = useState(null)

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setStatus('success')
      },
      (err) => {
        setError(err.message)
        setStatus('error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  const reset = useCallback(() => {
    setCoords(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { coords, status, error, request, reset }
}
