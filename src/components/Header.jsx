import { useEffect, useState } from 'react'
import useStore from '../store/useStore'

// Iloilo City Government official seal — hosted on the city gov website
const SEAL_URL = 'https://iloilocity.gov.ph/wp-content/uploads/2021/07/iloilo-city-seal.png'

export default function Header({ user, onLogout }) {
  const { darkMode, toggleDarkMode, toggleSidebar, sidebarOpen, lang, toggleLang } = useStore()
  const [time, setTime] = useState(new Date())
  const [sealErr, setSealErr] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

  const roleColor = {
    admin:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    operator: 'bg-[#e6f4f5] text-[#01696f] dark:bg-[#01696f]/20 dark:text-[#4dc8cf]',
    viewer:   'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }

  return (
    <header
      role="banner"
      className={`fixed top-0 right-0 z-30 h-14 bg-white dark:bg-zinc-900 border-b border-black/10 dark:border-white/10 flex items-center px-3 gap-2 shadow-sm transition-all duration-300 left-0 ${
        sidebarOpen ? 'md:left-60' : ''
      }`}
    >
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#01696f] focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 shrink-0"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
          {sidebarOpen
            ? <path d="M14 4l-5 5 5 5M4 4l5 5-5 5" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round"/>
            : <><rect x="2" y="4" width="14" height="1.8" rx="1"/><rect x="2" y="8.1" width="14" height="1.8" rx="1"/><rect x="2" y="12.2" width="14" height="1.8" rx="1"/></>}
        </svg>
      </button>

      {/* City seal + title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Iloilo City Government seal */}
        {!sealErr ? (
          <img
            src={SEAL_URL}
            alt="Iloilo City Government seal"
            width={32}
            height={32}
            loading="eager"
            decoding="async"
            onError={() => setSealErr(true)}
            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-black/10 dark:ring-white/10"
          />
        ) : (
          /* SVG fallback if the remote image fails to load */
          <svg
            aria-label="Iloilo City Government seal"
            viewBox="0 0 32 32"
            width="32"
            height="32"
            className="w-8 h-8 shrink-0"
            fill="none"
          >
            <circle cx="16" cy="16" r="15" fill="#01696f" stroke="#0c4e54" strokeWidth="1"/>
            <text x="16" y="13" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold" fontFamily="sans-serif">ILOILO</text>
            <text x="16" y="21" textAnchor="middle" fontSize="5.5" fill="white" fontFamily="sans-serif">CITY</text>
          </svg>
        )}

        <span className="sm:hidden text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
          iloilocity.app
        </span>
        <span className="hidden sm:block text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">
          iloilocity.app — {lang === 'hil' ? 'Dashboard sang Iloilo City' : 'Iloilo City Dashboard'}
        </span>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-medium shrink-0"
          aria-label="Live data"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" aria-hidden="true" />
          Live
        </span>
      </div>

      {/* Clock — desktop */}
      <div className="tabular hidden md:flex flex-col items-end text-xs shrink-0" aria-label={`Current time: ${timeStr}, ${dateStr}`}>
        <span className="font-semibold text-zinc-700 dark:text-zinc-200" aria-hidden="true">{timeStr}</span>
        <span className="text-zinc-400" aria-hidden="true">{dateStr}</span>
      </div>

      {/* Clock — mobile compact */}
      <div className="tabular md:hidden text-xs font-semibold text-zinc-500 shrink-0" aria-hidden="true">
        {timeStr}
      </div>

      {/* Logged-in user */}
      {user && (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-tight">
              {user.full_name ?? user.username}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-px rounded capitalize ${ roleColor[user.role] ?? roleColor.viewer }`}>
              {user.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-red-800 transition-colors shrink-0 text-sm"
          >
            <span aria-hidden="true">⏏</span>
          </button>
        </div>
      )}

      {/* EN / HIL language toggle */}
      <div
        role="group"
        aria-label="Language selection"
        className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden shrink-0"
      >
        {['en', 'hil'].map((l) => (
          <button
            key={l}
            onClick={() => l !== lang && toggleLang()}
            aria-pressed={lang === l}
            aria-label={l === 'en' ? 'Switch to English' : 'Pag-usab sa Hiligaynon'}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${
              lang === l
                ? 'bg-[#01696f] text-white'
                : 'bg-white dark:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {l === 'en' ? 'EN' : 'HIL'}
          </button>
        ))}
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={darkMode}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 shrink-0"
      >
        {darkMode
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
      </button>
    </header>
  )
}
