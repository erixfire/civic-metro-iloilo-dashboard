import { useEffect } from 'react'
import useStore  from './store/useStore'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import KpiBar from './components/KpiBar'
import WeatherCard from './components/WeatherCard'
import UtilityAlertsWidget from './components/UtilityAlertsWidget'
import TrafficCard from './components/TrafficCard'
import TrafficMap from './components/TrafficMap'
import EmergencyDirectory from './components/EmergencyDirectory'
import CswdoServices from './components/CswdoServices'
import FuelWatchCard from './components/FuelWatchCard'
import HeatIndexCard from './components/HeatIndexCard'
import HeatIndexNewsCard from './components/HeatIndexNewsCard'
import RainGaugeCard from './components/RainGaugeCard'
import TideCard from './components/TideCard'
import IncidentReportForm from './components/IncidentReportForm'
import IncidentList from './components/IncidentList'
import IncidentMap from './components/IncidentMap'
import KitchenFeedingCard from './components/KitchenFeedingCard'
import CmcBoard from './components/CmcBoard'
import AdminPanel from './components/AdminPanel'
import AdminLoginPage from './components/AdminLoginPage'

function usePwaDeepLink() {
  const setActiveSection = useStore((s) => s.setActiveSection)
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section) { setActiveSection(section); window.history.replaceState({}, '', '/') }
  }, [setActiveSection])
}

// Register service worker for Web Push + offline
function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
}

export default function App() {
  const { darkMode, sidebarOpen, activeSection, setActiveSection } = useStore()
  const { user, loading, login, logout, loginError, loginBusy }   = useAuth()
  usePwaDeepLink()
  useServiceWorker()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="min-h-dvh bg-zinc-100 dark:bg-zinc-950 transition-colors">
      <Sidebar />
      <Header user={user} onLogout={logout} />
      <main className={`pt-14 min-h-dvh transition-all duration-300 ${ sidebarOpen ? 'pl-56' : 'pl-0' }`}>
        <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">

          {activeSection === 'dashboard' && (
            <>
              <KpiBar />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <div className="flex flex-col gap-5"><WeatherCard /><FuelWatchCard /></div>
                <div className="lg:col-span-2"><HeatIndexCard /></div>
              </div>
              <div className="mb-5"><TrafficMap /></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <TrafficCard /><EmergencyDirectory />
              </div>
              <div className="mb-5"><CswdoServices /></div>
              <div className="mb-5"><KitchenFeedingCard /></div>
            </>
          )}

          {activeSection === 'weather' && (
            <>
              <SectionTitle>🌤️ Weather, Tide, Heat Index & Flood Monitor</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <WeatherCard /><HeatIndexCard /><TideCard />
              </div>
              <div className="mb-5"><HeatIndexNewsCard /></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <RainGaugeCard /><FuelWatchCard />
              </div>
              <div className="mb-5"><TrafficMap /></div>
            </>
          )}

          {activeSection === 'incidents' && (
            <>
              <SectionTitle>📌 CDRRMO Incident Reports</SectionTitle>
              <div className="mb-5"><IncidentMap /></div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                <IncidentReportForm /><IncidentList />
              </div>
            </>
          )}

          {activeSection === 'traffic' && (
            <>
              <SectionTitle>🚦 Traffic & Transport</SectionTitle>
              <div className="mb-5"><TrafficMap /></div>
              <TrafficCard />
            </>
          )}

          {activeSection === 'utilities' && (
            <>
              <SectionTitle>⚡ Utility Advisories</SectionTitle>
              <div className="max-w-xl"><UtilityAlertsWidget /></div>
            </>
          )}

          {activeSection === 'cswdo' && (
            <>
              <SectionTitle>🧑‍🤝‍🧑 CSWDO Services</SectionTitle>
              <div className="mb-5"><CswdoServices /></div>
              <KitchenFeedingCard />
            </>
          )}

          {activeSection === 'community-kitchen' && (
            <>
              <SectionTitle>🍲 Community Kitchen Feeding Program</SectionTitle>
              <KitchenFeedingCard />
            </>
          )}

          {activeSection === 'emergency' && (
            <>
              <SectionTitle>📞 Emergency Directory</SectionTitle>
              <div className="max-w-xl"><EmergencyDirectory /></div>
            </>
          )}

          {/* ── ADMIN — Protected ─────────────────────────── */}
          {activeSection === 'admin' && (
            <>
              {loading && (
                <div className="flex items-center justify-center py-24">
                  <div className="animate-spin w-8 h-8 rounded-full border-4 border-[#01696f] border-t-transparent" />
                </div>
              )}
              {!loading && !user && (
                <AdminLoginPage onLogin={login} loginError={loginError} loginBusy={loginBusy} />
              )}
              {!loading && user && (
                <AdminPanel onNavigate={setActiveSection} user={user} />
              )}
            </>
          )}

          {activeSection === 'cmc' && (
            <>
              <SectionTitle>🏛️ Crisis Management Council — Meeting Board</SectionTitle>
              <CmcBoard />
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-5">{children}</h1>
}
