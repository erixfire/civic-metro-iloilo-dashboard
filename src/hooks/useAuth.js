/**
 * useAuth — Admin session management
 * Security hardening:
 * - Token stored in localStorage with expiry check on every restore
 * - Expired tokens are evicted immediately on mount
 * - Logout calls /api/auth/logout to invalidate server-side session
 * - getToken() is provided so components never access localStorage directly
 * - isAdmin / isOperator convenience flags
 */
import { useState, useEffect, useCallback } from 'react'

const TOKEN_KEY = 'civic_admin_token'

/** Decode JWT-like token payload without verifying signature (verification is server-side) */
function decodePayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1]))
  } catch { return null }
}

/** Returns true if token is present and not yet expired (with 30s buffer) */
function isTokenValid(token) {
  if (!token) return false
  const payload = decodePayload(token)
  if (!payload?.exp) return false
  return payload.exp > Math.floor(Date.now() / 1000) + 30
}

export function useAuth() {
  const [user,        setUser]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [loginError,  setLoginError]  = useState('')
  const [loginBusy,   setLoginBusy]   = useState(false)

  // Verify stored token on mount — evict if expired before making any network call
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)

    // Fast path: token missing or locally expired — no network call needed
    if (!stored || !isTokenValid(stored)) {
      localStorage.removeItem(TOKEN_KEY)
      setLoading(false)
      return
    }

    // Verify with server (catches revoked / tampered tokens)
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setUser(d.user)
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
      })
      .catch(() => {
        // Network error: keep token locally, try again next time
        // Don't remove token on network failure to avoid logging out on flaky connection
        const payload = decodePayload(stored)
        if (payload?.sub) {
          setUser({ id: payload.sub, username: payload.username, role: payload.role })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    setLoginError('')
    setLoginBusy(true)
    try {
      const r = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim().toLowerCase(), password }),
      })
      const d = await r.json()

      if (!r.ok || !d.ok) {
        setLoginError(d.error ?? 'Login failed')
        return false
      }

      // Validate token has not already expired (clock skew guard)
      if (!isTokenValid(d.token)) {
        setLoginError('Session token invalid. Please try again.')
        return false
      }

      localStorage.setItem(TOKEN_KEY, d.token)
      setUser(d.user)
      return true
    } catch {
      setLoginError('Network error. Please try again.')
      return false
    } finally {
      setLoginBusy(false)
    }
  }, [])

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    if (token) {
      await fetch('/api/auth/logout', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }, [])

  const getToken = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    return isTokenValid(token) ? token : null
  }, [])

  return {
    user,
    loading,
    login,
    logout,
    loginError,
    loginBusy,
    getToken,
    isAdmin:    user?.role === 'admin',
    isOperator: user?.role === 'operator' || user?.role === 'admin',
  }
}
