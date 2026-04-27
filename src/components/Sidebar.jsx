import useStore from '../store/useStore'

const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',           icon: '🏠' },
  { id: 'heat-index',     label: 'Heat Index',           icon: '🌡️' },
  { id: 'flood-monitor',  label: 'Flood & Rain',         icon: '💧' },
  { id: 'incidents',      label: 'Incident Reports',     icon: '📌' },
  { id: 'traffic',        label: 'Traffic & Transport',  icon: '🚦' },
  { id: 'weather',        label: 'Weather & Tide',       icon: '🌤️' },
  { id: 'utilities',      label: 'Utility Alerts',       icon: '⚡' },
  { id: 'cswdo',          label: 'CSWDO Services',       icon: '🏛️' },
  { id: 'emergency',      label: 'Emergency Directory',  icon: '📞' },
]

export default function Sidebar() {
  const { sidebarOpen, activeSection, setActiveSection } = useStore()

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 bg-white dark:bg-zinc-900 border-r border-black/10 dark:border-white/10 shadow-lg transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-black/10 dark:border-white/10 shrink-0">
        <svg width="28" height="28" viewBox="0 0 32 32" aria-label="Civic Metro Iloilo Logo">
          <rect width="32" height="32" rx="7" fill="#01696f" />
          <text x="16" y="22" fontFamily="Inter,sans-serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">IC</text>
        </svg>
        <div>
          <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-tight">Metro Iloilo</div>
          <div className="text-xs text-zinc-400">Civic Dashboard</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors text-left ${
              activeSection === item.id
                ? 'bg-brand-600 text-white'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-5 py-3 border-t border-black/10 dark:border-white/10 text-xs text-zinc-400">
        Iloilo City Gov’t © 2026
      </div>
    </aside>
  )
}
