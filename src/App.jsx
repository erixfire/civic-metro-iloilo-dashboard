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
import AirQualityCard from './components/AirQualityCard'
import ForecastStrip from './components/ForecastStrip'
import ForecastMini from './components/ForecastMini'
import IncidentReportForm from './components/IncidentReportForm'
import IncidentList from './components/IncidentList'
import IncidentMap from './components/IncidentMap'
import NewsPage from './components/NewsPage'
import NewsTickerBanner from './components/NewsTickerBanner'
import AdminPanel from './components/AdminPanel'
import AdminLoginPage from './components/AdminLoginPage'

function usePwaDeepLink() {
  const setActiveSection = useStore((s) => s.setActiveSection)
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const section = params.get('section')
    const blocked = ['cmc', 'community-kitchen']
    if (section && !blocked.includes(section)) {
      setActiveSection(section)
      window.history.replaceState({}, '', '/')
    }
  }, [setActiveSection])
}

function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
}

export default function App() {
  const { darkMode, sidebarOpen, setSidebarOpen, activeSection, setActiveSection } = useStore()
  const { user, loading, login, logout, loginError, loginBusy, getToken } = useAuth()
  usePwaDeepLink()
  useServiceWorker()

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode) }, [darkMode])

  useEffect(() => {
    const adminOnly = ['cmc', 'community-kitchen']
    if (adminOnly.includes(activeSection) && !user) setActiveSection('admin')
  }, [activeSection, user, setActiveSection])

  const isPublicSection = !['admin', 'cmc', 'community-kitchen'].includes(activeSection)

  return (
    <div className="min-h-dvh bg-zinc-100 dark:bg-zinc-950 transition-colors">
      <Sidebar />
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Header user={user} onLogout={logout} />

      <main className={`pt-14 pb-20 md:pb-6 min-h-dvh transition-all duration-300 ${
        sidebarOpen ? 'md:pl-60' : 'pl-0'
      }`}>

        {/* ── Logo Banner ────────────────────────────────────────── */}
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-black/5 dark:border-white/5 flex items-center justify-center py-3 px-4">
          <img src="/ilocitylogo.png" alt="Iloilo City Government"
            className="h-14 sm:h-16 md:h-20 w-auto object-contain select-none" draggable={false} />
        </div>

        <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 max-w-screen-2xl mx-auto">

          {isPublicSection && <NewsTickerBanner />}

          {/* ── DASHBOARD ─────────────────────────────────────── */}
          {activeSection === 'dashboard' && (
            <>
              <KpiBar />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <WeatherCard />
                  <AirQualityCard />
                </div>
                <div className="lg:col-span-2"><HeatIndexCard /></div>
              </div>
              {/* 5-day forecast mini strip */}
              <div className="mb-3 sm:mb-4"><ForecastMini /></div>
              <div className="mb-3 sm:mb-4"><TrafficMap /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <FuelWatchCard /><TrafficCard /><EmergencyDirectory />
              </div>
            </>
          )}

          {/* ── WEATHER ───────────────────────────────────────── */}
          {activeSection === 'weather' && (
            <>
              <SectionTitle icon="🌤️" en="Weather, Tide & Air Quality" hil="Panahon, Tubig, kag Kalidad sang Hangin" />
              {/* Row 1: current weather + heat index + tide */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <WeatherCard /><HeatIndexCard /><TideCard />
              </div>
              {/* Row 2: AQI + Rain Gauge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <AirQualityCard /><RainGaugeCard />
              </div>
              {/* Row 3: Full 5-day forecast strip */}
              <div className="mb-3 sm:mb-4"><ForecastStrip /></div>
              {/* Row 4: Advisory feed */}
              <div className="mb-3 sm:mb-4"><HeatIndexNewsCard /></div>
              <div className="mb-3 sm:mb-4"><FuelWatchCard /></div>
            </>
          )}

          {/* ── INCIDENTS ─────────────────────────────────────── */}
          {activeSection === 'incidents' && (
            <>
              <SectionTitle icon="📌" en="Incident Reports" hil="Mga Insidente" />
              <div className="mb-3 sm:mb-4"><IncidentMap /></div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <IncidentReportForm /><IncidentList />
              </div>
            </>
          )}

          {activeSection === 'traffic' && (
            <>
              <SectionTitle icon="🚦" en="Traffic & Transport" hil="Trapiko" />
              <div className="mb-3 sm:mb-4"><TrafficMap /></div>
              <TrafficCard />
            </>
          )}

          {activeSection === 'utilities' && (
            <>
              <SectionTitle icon="⚡" en="Utility Advisories" hil="Alerto sa Kuryente / Tubig" />
              <div className="max-w-xl"><UtilityAlertsWidget /></div>
            </>
          )}

          {activeSection === 'news' && <NewsPage />}

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
              {!loading && !user && <AdminLoginPage onLogin={login} loginError={loginError} loginBusy={loginBusy} />}
              {!loading && user  && <AdminPanel onNavigate={setActiveSection} user={user} getToken={getToken} />}
            </>
          )}

          {activeSection === 'cmc' && (
            <>
              {!loading && !user && <AdminLoginPage onLogin={login} loginError={loginError} loginBusy={loginBusy} />}
              {!loading && user  && <AdminPanel onNavigate={setActiveSection} user={user} getToken={getToken} defaultTab="cmc-manage" />}
            </>
          )}

          {activeSection === 'community-kitchen' && (
            <>
              {!loading && !user && <AdminLoginPage onLogin={login} loginError={loginError} loginBusy={loginBusy} />}
              {!loading && user  && <AdminPanel onNavigate={setActiveSection} user={user} getToken={getToken} defaultTab="kitchen" />}
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function SectionTitle({ icon, en, hil }) {
  return (
    <div className="mb-3 sm:mb-4">
      <h1 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100">{icon} {en}</h1>
      {hil && <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">{hil}</p>}
    </div>
  )
}
