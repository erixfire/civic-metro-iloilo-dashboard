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

function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
}

export default function App() {
  const { darkMode, sidebarOpen, setSidebarOpen, activeSection, setActiveSection } = useStore()
  const { user, loading, login, logout, loginError, loginBusy } = useAuth()
  usePwaDeepLink()
  useServiceWorker()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="min-h-dvh bg-zinc-100 dark:bg-zinc-950 transition-colors">
      <Sidebar />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Header user={user} onLogout={logout} />

      {/* pt-14 = header, pb-20 on mobile = clears bottom nav, md:pb-6 on desktop */}
      <main className={`pt-14 pb-20 md:pb-6 min-h-dvh transition-all duration-300 ${
        sidebarOpen ? 'md:pl-60' : 'pl-0'
      }`}>
        <div className="px-3 py-4 md:px-6 md:py-6 max-w-screen-2xl mx-auto">

          {activeSection === 'dashboard' && (
            <>
              <KpiBar />
              {/* Stack fully on mobile, 3-col on lg */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div className="flex flex-col gap-4">
                  <WeatherCard />
                  <FuelWatchCard />
                </div>
                <div className="lg:col-span-2"><HeatIndexCard /></div>
              </div>
              <div className="mb-4"><TrafficMap /></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <TrafficCard /><EmergencyDirectory />
              </div>
              <div className="mb-4"><KitchenFeedingCard /></div>
            </>
          )}

          {activeSection === 'weather' && (
            <>
              <SectionTitle icon="🌤️" en="Weather, Tide & Heat" hil="Panahon, Tubig, kag Kainit" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <WeatherCard /><HeatIndexCard /><TideCard />
              </div>
              <div className="mb-4"><HeatIndexNewsCard /></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <RainGaugeCard /><FuelWatchCard />
              </div>
            </>
          )}

          {activeSection === 'incidents' && (
            <>
              <SectionTitle icon="📌" en="Incident Reports" hil="Mga Insidente" />
              <div className="mb-4"><IncidentMap /></div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                <IncidentReportForm /><IncidentList />
              </div>
            </>
          )}

          {activeSection === 'traffic' && (
            <>
              <SectionTitle icon="🚦" en="Traffic & Transport" hil="Trapiko" />
              <div className="mb-4"><TrafficMap /></div>
              <TrafficCard />
            </>
          )}

          {activeSection === 'utilities' && (
            <>
              <SectionTitle icon="⚡" en="Utility Advisories" hil="Alerto sa Kuryente / Tubig" />
              <div className="max-w-xl"><UtilityAlertsWidget /></div>
            </>
          )}

          {activeSection === 'community-kitchen' && (
            <>
              <SectionTitle icon="🍲" en="Free Feeding Program" hil="Libre nga Pagkaon" />
              <KitchenFeedingCard />
            </>
          )}

          {activeSection === 'emergency' && (
            <>
              <SectionTitle icon="🆘" en="Emergency Hotlines" hil="I-tap para tawgon" />
              <div className="max-w-xl"><EmergencyDirectory /></div>
            </>
          )}

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
              <SectionTitle icon="🏛️" en="CMC Meeting Board" hil="Crisis Management Council" />
              <CmcBoard />
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function SectionTitle({ icon, en, hil }) {
  return (
    <div className="mb-4">
      <h1 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{icon} {en}</h1>
      {hil && <p className="text-xs text-zinc-400 mt-0.5">{hil}</p>}
    </div>
  )
}
