import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { useLang } from '../hooks/useLang'

const NAV_ITEMS = [
  { id: 'dashboard',  en: 'Home',              hil: 'Balay',                   icon: '🏠', group: 'main'  },
  { id: 'weather',    en: 'Weather & Tide',     hil: 'Panahon & Tubig',          icon: '🌤️', group: 'main'  },
  { id: 'incidents',  en: 'Incidents',          hil: 'Mga Insidente',            icon: '📌', group: 'main'  },
  { id: 'traffic',    en: 'Traffic',            hil: 'Trapiko',                  icon: '🚦', group: 'main'  },
  { id: 'utilities',  en: 'Utility Alerts',     hil: 'Alerto sa Kuryente/Tubig', icon: '⚡',  group: 'main'  },
  { id: 'news',       en: 'News & Alerts',      hil: 'Balita',                   icon: '📰', group: 'main'  },
  { id: 'emergency',  en: 'Emergency Hotlines', hil: 'Mga Numero sa Emergency',  icon: '🆘', group: 'main'  },
  { id: 'admin',      en: 'Admin Panel',        hil: 'Panel sang Admin',         icon: '⚙️',  group: 'admin' },
]

const BOTTOM_NAV = [
  { id: 'dashboard', en: 'Home',      hil: 'Balay',     icon: '🏠' },
  { id: 'incidents', en: 'Incidents', hil: 'Insidente', icon: '📌' },
  { id: 'news',      en: 'News',      hil: 'Balita',    icon: '📰' },
  { id: 'emergency', en: 'Help',      hil: 'Bulig',     icon: '🆘' },
]

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeSection, setActiveSection } = useStore()
  const { lang, t } = useLang()
  const mainItems  = NAV_ITEMS.filter(n => n.group === 'main')
  const adminItems = NAV_ITEMS.filter(n => n.group === 'admin')
  const firstFocusableRef = useRef(null)

  function navigate(id) { setActiveSection(id); setSidebarOpen(false) }

  useEffect(() => {
    if (!sidebarOpen) return
    firstFocusableRef.current?.focus()
    function onKey(e) { if (e.key === 'Escape') setSidebarOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sidebarOpen, setSidebarOpen])

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        role="navigation"
        aria-label={t('Main navigation', 'Panguna nga Nabigasyon')}
        className={`fixed top-0 left-0 h-full z-50 bg-white dark:bg-zinc-900 border-r border-black/10 dark:border-white/10 shadow-lg transition-transform duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0 w-60' : '-translate-x-full w-60 md:translate-x-0 md:w-0 md:overflow-hidden'
        }`}
      >
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-black/10 dark:border-white/10 shrink-0">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-label="iloilocity.app logo" role="img">
            <rect width="32" height="32" rx="7" fill="#01696f" />
            <text x="16" y="22" fontFamily="Inter,sans-serif" fontSize="14" fontWeight="700" fill="white" textAnchor="middle">IC</text>
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-tight truncate">iloilocity.app</div>
            <div className="text-[10px] text-zinc-400">
              {t('Iloilo City Dashboard', 'Dashboard sang Iloilo City')}
            </div>
          </div>
          <button
            ref={firstFocusableRef}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            aria-label={t('Close navigation menu', 'Isara ang menu')}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav aria-label={t('Main pages', 'Mga Pahina')} className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {mainItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-[#01696f] text-white'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base shrink-0" aria-hidden="true">{item.icon}</span>
              <div className="min-w-0">
                {/* Primary label: active language */}
                <div className="text-sm font-semibold truncate" lang={lang}>
                  {t(item.en, item.hil)}
                </div>
                {/* Subtitle: the other language (dimmed) */}
                <div className="text-[10px] opacity-50 truncate" lang={lang === 'en' ? 'hil' : 'en'}>
                  {lang === 'en' ? item.hil : item.en}
                </div>
              </div>
            </button>
          ))}

          <div className="pt-4 pb-1 px-3" role="separator" aria-label={t('Admin section', 'Seksyon sang Admin')}>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest" aria-hidden="true">
              {t('Admin', 'Admin')}
            </div>
          </div>

          {adminItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-zinc-800 text-white dark:bg-zinc-700'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base shrink-0" aria-hidden="true">{item.icon}</span>
              <span className="text-sm font-medium truncate" lang={lang}>{t(item.en, item.hil)}</span>
            </button>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-black/10 dark:border-white/10 text-xs text-zinc-400 shrink-0">
          iloilocity.app © 2026
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        aria-label={t('Mobile quick navigation', 'Madali nga Nabigasyon')}
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-zinc-900 border-t border-black/10 dark:border-white/10"
      >
        <div className="flex items-stretch" role="list">
          {BOTTOM_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              role="listitem"
              aria-current={activeSection === item.id ? 'page' : undefined}
              aria-label={t(item.en, item.hil)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                activeSection === item.id
                  ? 'text-[#01696f] dark:text-teal-400'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <span className="text-[10px] font-semibold" lang={lang}>{t(item.en, item.hil)}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
