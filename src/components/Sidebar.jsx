import useStore from '../store/useStore'

const NAV_ITEMS = [
  { id: 'dashboard',        label: 'Dashboard',          icon: '🏠' },
  { id: 'heat-index',       label: 'Heat Index',          icon: '🌡️' },
  { id: 'flood-monitor',    label: 'Flood & Rain',        icon: '💧' },
  { id: 'incidents',        label: 'Incident Reports',    icon: '📌' },
  { id: 'traffic',          label: 'Traffic & Transport', icon: '🚦' },
  { id: 'weather',          label: 'Weather & Tide',      icon: '🌤️' },
  { id: 'utilities',        label: 'Utility Alerts',      icon: '⚡' },
  { id: 'cswdo',            label: 'CSWDO Services',      icon: '🏛️' },
  { id: 'community-kitchen',label: 'Community Kitchen',   icon: '🍲' },
  { id: 'emergency',        label: 'Emergency Directory', icon: '📞' },
]

export default function Sidebar() {
  const { sidebarOpen, activeSection, setActiveSection } = useStore()

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-50 bg-white dark:bg-zinc-900 border-r border-black/10 dark:border-white/10 shadow-lg transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
      }`}
    >
      {/* Logo / brand */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-4 border-b border-black/10 dark:border-white/10 shrink-0">
        <svg width="28" height="28" viewBox="0 0 32 32" aria-label="Civic Metro Iloilo Logo">
          <rect width="32" height="32" rx="7" fill="#01696f" />
          <text x="16" y="22" fontFamily="Inter,sans-serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">IC</text>
        </svg>
        <div className="min-w-0">
          <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-tight truncate">Metro Iloilo</div>
          <div className="text-xs text-zinc-400">Civic Dashboard</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors text-left ${
              activeSection === item.id
                ? 'bg-[#01696f] text-white'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-5 py-3 border-t border-black/10 dark:border-white/10 text-xs text-zinc-400 shrink-0">
        Iloilo City Gov't © 2026
      </div>
    </aside>
  )
}
