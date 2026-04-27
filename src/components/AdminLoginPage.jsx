/**
 * AdminLoginPage — Full-screen login gate for the Admin section
 */
import { useState } from 'react'

export default function AdminLoginPage({ onLogin, loginError, loginBusy }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) return
    await onLogin(username, password)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#01696f] text-white text-3xl mb-4 shadow-lg">
            ⚡
          </div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            OpCen Admin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Civic Metro Iloilo Dashboard
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator"
                className="input-field"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-sm">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {loginError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <span>⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginBusy || !username || !password}
              className="w-full py-2.5 rounded-xl bg-[#01696f] hover:bg-[#015a5f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-sm">
              {loginBusy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-400 mt-6">
          Iloilo City Government · CDRRMO / CMC OpCen
          <br />Session expires after 8 hours
        </p>

      </div>
    </div>
  )
}
