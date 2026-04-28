/**
 * AdminLoginPage — Secure login gate for the Admin section
 * Security features:
 * - Client-side rate limiting: 5 attempts →  15-minute lockout
 * - Failed attempt counter with visual feedback
 * - Auto-clear password on failed attempt
 * - No username enumeration (generic error messages)
 * - Lockout persisted in sessionStorage (clears on tab close)
 */
import { useState, useEffect } from 'react'

const MAX_ATTEMPTS  = 5
const LOCKOUT_MS    = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_KEY   = 'civic_lockout'
const ATTEMPTS_KEY  = 'civic_attempts'

function getLockoutState() {
  try {
    const lockoutUntil = parseInt(sessionStorage.getItem(LOCKOUT_KEY) ?? '0', 10)
    const attempts     = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) ?? '0', 10)
    return { lockoutUntil, attempts }
  } catch { return { lockoutUntil: 0, attempts: 0 } }
}

function setAttempts(n) {
  try { sessionStorage.setItem(ATTEMPTS_KEY, String(n)) } catch {}
}

function setLockout() {
  try {
    const until = Date.now() + LOCKOUT_MS
    sessionStorage.setItem(LOCKOUT_KEY, String(until))
    sessionStorage.setItem(ATTEMPTS_KEY, String(MAX_ATTEMPTS))
    return until
  } catch { return Date.now() + LOCKOUT_MS }
}

function clearLockout() {
  try { sessionStorage.removeItem(LOCKOUT_KEY); sessionStorage.removeItem(ATTEMPTS_KEY) } catch {}
}

export default function AdminLoginPage({ onLogin, loginError, loginBusy }) {
  const [username,       setUsername]       = useState('')
  const [password,       setPassword]       = useState('')
  const [showPw,         setShowPw]         = useState(false)
  const [attempts,       setAttemptsState]  = useState(0)
  const [lockedUntil,    setLockedUntil]    = useState(0)
  const [countdown,      setCountdown]      = useState(0)
  const [localError,     setLocalError]     = useState('')

  // Restore lockout state on mount
  useEffect(() => {
    const { lockoutUntil, attempts: a } = getLockoutState()
    setAttemptsState(a)
    if (lockoutUntil > Date.now()) {
      setLockedUntil(lockoutUntil)
    } else if (lockoutUntil > 0) {
      clearLockout()
    }
  }, [])

  // Countdown timer during lockout
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining === 0) { clearLockout(); setLockedUntil(0); setAttemptsState(0) }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  const isLocked = lockedUntil > Date.now()
  const remaining = attempts > 0 ? MAX_ATTEMPTS - attempts : null

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError('')
    if (isLocked) return
    if (!username.trim() || !password) return

    const success = await onLogin(username, password)

    if (success === false || loginError) {
      const newAttempts = attempts + 1
      setAttemptsState(newAttempts)
      setAttempts(newAttempts)
      setPassword('') // clear password on failure

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = setLockout()
        setLockedUntil(until)
        setLocalError(`Too many failed attempts. Locked for 15 minutes.`)
      } else {
        setLocalError(`Incorrect credentials. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`)
      }
    } else {
      clearLockout()
      setAttemptsState(0)
    }
  }

  const mins = Math.floor(countdown / 60)
  const secs = String(countdown % 60).padStart(2, '0')

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#01696f] text-white text-3xl mb-4 shadow-lg">
            ⭐
          </div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            OpCen Admin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            iloilocity.app — Authorized Personnel Only
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl p-7">

          {/* Lockout banner */}
          {isLocked && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-4">
              <span className="text-xl">🔒</span>
              <div>
                <div className="text-sm font-semibold text-red-700 dark:text-red-300">Account Locked</div>
                <div className="text-xs text-red-500 mt-0.5">
                  Try again in <span className="font-bold tabular">{mins}:{secs}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                required
                disabled={isLocked}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator"
                className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isLocked}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-sm">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Attempt warning */}
            {!isLocked && attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <span>⚠️</span>
                <span>{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining before lockout</span>
              </div>
            )}

            {/* Error */}
            {(localError || (!isLocked && loginError)) && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <span>⚠️</span>
                <span>{localError || loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginBusy || isLocked || !username || !password}
              className="w-full py-2.5 rounded-xl bg-[#01696f] hover:bg-[#015a5f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-sm">
              {loginBusy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : isLocked ? '🔒 Locked' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-6">
          Iloilo City Government · CDRRMO / CMC OpCen
          <br />Session expires after 8 hours · Unauthorized access is prohibited
        </p>
      </div>
    </div>
  )
}
