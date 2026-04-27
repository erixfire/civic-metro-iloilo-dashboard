import useStore from '../store/useStore'

const NAV_ITEMS = [
  { id: 'dashboard',         en: 'Home',               hil: 'Balay',            icon: '🏠', group: 'main' },
  { id: 'weather',           en: 'Weather & Tide',      hil: 'Panahon & Tubig',  icon: '🌤️', group: 'main' },
  { id: 'incidents',         en: 'Incidents',           hil: 'Mga Insidente',    icon: '📌', group: 'main' },
  { id: 'traffic',           en: 'Traffic',             hil: 'Trapiko',          icon: '🚦', group: 'main' },
  { id: 'utilities',         en: 'Utility Alerts',      hil: 'Alerto sa Kuryente/Tubig', icon: '⚡', group: 'main' },
  { id: 'community-kitchen', en: 'Free Feeding',        hil: 'Libre nga Pagkaon', icon: '🍲', group: 'main' },
  { id: 'emergency',         en: 'Emergency Hotlines',  hil: 'Emergency Hotlines', icon: '🆘', group: 'main' },
  // Admin
  { id: 'admin',             en: 'Admin Panel',         hil: '',                 icon: '⚙️',  group: 'admin' },
  { id: 'cmc',               en: 'CMC Meetings',        hil: '',                 icon: '🏛️', group: 'admin' },
]

const BOTTOM_NAV = [
  { id: 'dashboard',  en: 'Home',      hil: 'Balay',    icon: '🏠' },
  { id: 'incidents',  en: 'Incidents', hil: 'Insidente', icon: '📌' },
  { id: 'weather',    en: 'Weather',   hil: 'Panahon',  icon: '🌤️' },
  { id: 'emergency',  en: 'Help',      hil: 'Bulig',    icon: '🆘' },
]

export default function Sidebar() {
  const { sidebarOpen, activeSection, setActiveSection } = useStore()

  const mainItems  = NAV_ITEMS.filter(n => n.group === 'main')
  const adminItems = NAV_ITEMS.filter(n => n.group === 'admin')

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-white dark:bg-zinc-900 border-r border-black/10 dark:border-white/10 shadow-lg transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        }`}
      >
        {/* Logo */}
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

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-[#01696f] text-white'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{item.en}</div>
                {item.hil && <div className="text-[10px] opacity-60 truncate">{item.hil}</div>}
              </div>
            </button>
          ))}

          <div className="pt-4 pb-1 px-3">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Admin</div>
          </div>

          {adminItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-zinc-800 text-white dark:bg-zinc-700'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <span className="text-sm font-medium truncate">{item.en}</span>
            </button>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-black/10 dark:border-white/10 text-xs text-zinc-400 shrink-0">
          Iloilo City Gov't © 2026
        </div>
      </aside>

      {/* ── Mobile bottom nav ───────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-zinc-900 border-t border-black/10 dark:border-white/10 safe-area-inset-bottom">
        <div className="flex items-stretch">
          {BOTTOM_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                activeSection === item.id
                  ? 'text-[#01696f] dark:text-teal-400'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.en}</span>
              <span className="text-[9px] opacity-60">{item.hil}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
