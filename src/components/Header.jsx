import useStore from '../store/useStore'

export default function Header() {
  const { darkMode, toggleDarkMode, toggleSidebar, sidebarOpen } = useStore()
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-14 bg-white dark:bg-zinc-900 border-b border-black/10 dark:border-white/10 flex items-center px-4 gap-3 shadow-sm transition-all duration-300 ${
        sidebarOpen ? 'left-56' : 'left-0'
      }`}
    >
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 shrink-0"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          {sidebarOpen
            ? <path d="M14 4l-5 5 5 5M4 4l5 5-5 5" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round"/>
            : <><rect x="2" y="4" width="14" height="1.8" rx="1"/><rect x="2" y="8.1" width="14" height="1.8" rx="1"/><rect x="2" y="12.2" width="14" height="1.8" rx="1"/></>}
        </svg>
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="hidden sm:block text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">
          Civic Metro Iloilo Dashboard
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
          Live
        </span>
      </div>

      <div className="tabular hidden md:flex flex-col items-end text-xs shrink-0">
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{timeStr}</span>
        <span className="text-zinc-400">{dateStr}</span>
      </div>

      <button
        onClick={toggleDarkMode}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 shrink-0"
      >
        {darkMode
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
      </button>
    </header>
  )
}
