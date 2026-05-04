import { useEffect, useState } from 'react'
import useStore from '../store/useStore'

const SEAL = "data:image/jpeg;base64,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"

export default function Header({ user, onLogout }) {
  const { darkMode, toggleDarkMode, toggleSidebar, sidebarOpen, lang, toggleLang } = useStore()
  const [time, setTime] = useState(new Date())

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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#01696f] focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg">
        Skip to main content
      </a>

      <button onClick={toggleSidebar} aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} aria-expanded={sidebarOpen} aria-controls="app-sidebar" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
          {sidebarOpen
            ? <path d="M14 4l-5 5 5 5M4 4l5 5-5 5" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round"/>
            : <><rect x="2" y="4" width="14" height="1.8" rx="1"/><rect x="2" y="8.1" width="14" height="1.8" rx="1"/><rect x="2" y="12.2" width="14" height="1.8" rx="1"/></>}
        </svg>
      </button>

      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <img
          src={SEAL}
          alt="Iloilo City Government Seal"
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-black/20 dark:ring-white/20 shadow-sm bg-white"
        />
        <span className="sm:hidden text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">iloilocity.app</span>
        <span className="hidden sm:block text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">
          iloilocity.app — {lang === 'hil' ? 'Dashboard sang Iloilo City' : 'Iloilo City Dashboard'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-medium shrink-0" aria-label="Live data">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="tabular hidden md:flex flex-col items-end text-xs shrink-0" aria-label={`Current time: ${timeStr}, ${dateStr}`}>
        <span className="font-semibold text-zinc-700 dark:text-zinc-200" aria-hidden="true">{timeStr}</span>
        <span className="text-zinc-400" aria-hidden="true">{dateStr}</span>
      </div>
      <div className="tabular md:hidden text-xs font-semibold text-zinc-500 shrink-0" aria-hidden="true">{timeStr}</div>

      {user && (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-tight">{user.full_name ?? user.username}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-px rounded capitalize ${ roleColor[user.role] ?? roleColor.viewer }`}>{user.role}</span>
          </div>
          <button onClick={onLogout} aria-label="Sign out" title="Sign out" className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 dark:border-red-800 transition-colors shrink-0 text-sm">
            <span aria-hidden="true">⏏</span>
          </button>
        </div>
      )}

      <div role="group" aria-label="Language selection" className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden shrink-0">
        {['en', 'hil'].map((l) => (
          <button key={l} onClick={() => l !== lang && toggleLang()} aria-pressed={lang === l} aria-label={l === 'en' ? 'Switch to English' : 'Pag-usab sa Hiligaynon'} className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors ${lang === l ? 'bg-[#01696f] text-white' : 'bg-white dark:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
            {l === 'en' ? 'EN' : 'HIL'}
          </button>
        ))}
      </div>

      <button onClick={toggleDarkMode} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={darkMode} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 shrink-0">
        {darkMode
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
      </button>
    </header>
  )
}
