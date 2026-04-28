import useStore from '../store/useStore'

const NAV_ITEMS = [
  { id: 'dashboard',         en: 'Home',               hil: 'Balay',                   icon: '🏠', group: 'main' },
  { id: 'weather',           en: 'Weather & Tide',      hil: 'Panahon & Tubig',          icon: '🌤️', group: 'main' },
  { id: 'incidents',         en: 'Incidents',           hil: 'Mga Insidente',            icon: '📌', group: 'main' },
  { id: 'traffic',           en: 'Traffic',             hil: 'Trapiko',                  icon: '🚦', group: 'main' },
  { id: 'utilities',         en: 'Utility Alerts',      hil: 'Alerto sa Kuryente/Tubig', icon: '⚡',  group: 'main' },
  { id: 'community-kitchen', en: 'Free Feeding',        hil: 'Libre nga Pagkaon',        icon: '🍲', group: 'main' },
  { id: 'emergency',         en: 'Emergency Hotlines',  hil: 'Emergency Hotlines',       icon: '🆘', group: 'main' },
  { id: 'admin',             en: 'Admin Panel',         hil: '',                         icon: '⚙️',  group: 'admin' },
  { id: 'cmc',               en: 'CMC Meetings',        hil: '',                         icon: '🏛️', group: 'admin' },
]

const BOTTOM_NAV = [
  { id: 'dashboard',  en: 'Home',      hil: 'Balay',     icon: '🏠' },
  { id: 'incidents',  en: 'Incidents', hil: 'Insidente', icon: '📌' },
  { id: 'weather',    en: 'Weather',   hil: 'Panahon',   icon: '🌤️' },
  { id: 'emergency',  en: 'Help',      hil: 'Bulig',     icon: '🆘' },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeSection, setActiveSection } = useStore()

  const mainItems  = NAV_ITEMS.filter(n => n.group === 'main')
  const adminItems = NAV_ITEMS.filter(n => n.group === 'admin')

  // Navigate and auto-close sidebar on mobile
  function navigate(id) {
    setActiveSection(id)
    // Close sidebar on all screen sizes when a nav item is tapped
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile backdrop — tap anywhere outside sidebar to close */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop / mobile slide-over sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-white dark:bg-zinc-900 border-r border-black/10 dark:border-white/10 shadow-lg transition-transform duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0 w-60' : '-translate-x-full w-60 md:translate-x-0 md:w-0 md:overflow-hidden'
        }`}
      >
        {/* Logo + close button */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-black/10 dark:border-white/10 shrink-0">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-label="iloilocity.app">
            <rect width="32" height="32" rx="7" fill="#01696f" />
            <text x="16" y="22" fontFamily="Inter,sans-serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">IC</text>
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-tight truncate">iloilocity.app</div>
            <div className="text-[10px] text-zinc-400">Iloilo City Dashboard</div>
          </div>
          {/* Close button visible on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
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
              onClick={() => navigate(item.id)}
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
          iloilocity.app © 2026
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-zinc-900 border-t border-black/10 dark:border-white/10">
        <div className="flex items-stretch">
          {BOTTOM_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
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
