/**
 * useAuth — Admin session management
 * Stores token in localStorage. Verifies against /api/auth/me on mount.
 */
import { useState, useEffect, useCallback } from 'react'

const TOKEN_KEY = 'civic_admin_token'

export function useAuth() {
  const [user,        setUser]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [loginError,  setLoginError]  = useState('')
  const [loginBusy,   setLoginBusy]   = useState(false)

  // Verify stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) { setLoading(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setUser(d.user); else localStorage.removeItem(TOKEN_KEY) })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    setLoginError('')
    setLoginBusy(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) {
        setLoginError(d.error ?? 'Login failed')
        return false
      }
      localStorage.setItem(TOKEN_KEY, d.token)
      setUser(d.user)
      return true
    } catch {
      setLoginError('Network error. Please try again.')
      return false
    } finally { setLoginBusy(false) }
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), [])

  return { user, loading, login, logout, loginError, loginBusy, getToken, isAdmin: user?.role === 'admin' }
}
