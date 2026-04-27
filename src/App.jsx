import { useEffect } from 'react'
import useStore from './store/useStore'
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

export default function App() {
  const { darkMode, sidebarOpen, activeSection } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="min-h-dvh bg-zinc-100 dark:bg-zinc-950 transition-colors">
      <Sidebar />
      <Header />
      <main className={`pt-14 transition-all duration-300 ${sidebarOpen ? 'pl-56' : 'pl-0'}`}>
        <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">

          {/* DASHBOARD */}
          {activeSection === 'dashboard' && (
            <>
              <KpiBar />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <div className="space-y-5">
                  <WeatherCard />
                  <FuelWatchCard />
                </div>
                <div className="lg:col-span-2">
                  <UtilityAlertsWidget />
                </div>
              </div>
              <div className="mb-5">
                <HeatIndexCard />
              </div>
              <div className="mb-5">
                <TrafficMap />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <TrafficCard />
                <EmergencyDirectory />
              </div>
              <div className="mb-5">
                <CswdoServices />
              </div>
            </>
          )}

          {/* HEAT INDEX */}
          {activeSection === 'heat-index' && (
            <>
              <SectionTitle>🌡️ Heat Index & Advisories — Iloilo City</SectionTitle>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                <HeatIndexCard />
                <HeatIndexNewsCard />
              </div>
              <div className="max-w-md">
                <WeatherCard />
              </div>
            </>
          )}

          {/* TRAFFIC */}
          {activeSection === 'traffic' && (
            <>
              <SectionTitle>🚦 Traffic & Transport</SectionTitle>
              <div className="mb-5"><TrafficMap /></div>
              <TrafficCard />
            </>
          )}

          {/* WEATHER */}
          {activeSection === 'weather' && (
            <>
              <SectionTitle>🌤️ Weather & Tide</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <WeatherCard />
                <HeatIndexCard />
              </div>
              <div className="max-w-md">
                <FuelWatchCard />
              </div>
            </>
          )}

          {/* UTILITIES */}
          {activeSection === 'utilities' && (
            <>
              <SectionTitle>⚡ Utility Advisories</SectionTitle>
              <div className="max-w-xl"><UtilityAlertsWidget /></div>
            </>
          )}

          {/* CSWDO */}
          {activeSection === 'cswdo' && (
            <>
              <SectionTitle>🏛️ CSWDO Services</SectionTitle>
              <CswdoServices />
            </>
          )}

          {/* EMERGENCY */}
          {activeSection === 'emergency' && (
            <>
              <SectionTitle>📞 Emergency Directory</SectionTitle>
              <div className="max-w-xl"><EmergencyDirectory /></div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-5">{children}</h1>
  )
}
