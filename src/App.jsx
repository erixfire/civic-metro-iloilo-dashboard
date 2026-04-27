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
import RainGaugeCard from './components/RainGaugeCard'
import TideCard from './components/TideCard'
import IncidentReportForm from './components/IncidentReportForm'
import IncidentList from './components/IncidentList'

function usePwaDeepLink() {
  const setActiveSection = useStore((s) => s.setActiveSection)
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section) {
      setActiveSection(section)
      window.history.replaceState({}, '', '/')
    }
  }, [setActiveSection])
}

export default function App() {
  const { darkMode, sidebarOpen, activeSection } = useStore()
  usePwaDeepLink()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="min-h-dvh bg-zinc-100 dark:bg-zinc-950 transition-colors">
      {/* Sidebar sits above header (z-50) */}
      <Sidebar />

      {/* Header shifts right when sidebar is open — handled inside Header.jsx */}
      <Header />

      {/*
        Main content:
        - pt-14  → clears the 56px fixed header
        - pl-56 / pl-0 → clears the 224px sidebar when open
        Both transitions match the sidebar 300ms duration.
      */}
      <main
        className={`pt-14 min-h-dvh transition-all duration-300 ${
          sidebarOpen ? 'pl-56' : 'pl-0'
        }`}
      >
        <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">

          {/* ── DASHBOARD ─────────────────────────────────────── */}
          {activeSection === 'dashboard' && (
            <>
              <KpiBar />

              {/* Row 1: Weather + Fuel (left col) | Utility Alerts (right 2 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <div className="flex flex-col gap-5">
                  <WeatherCard />
                  <FuelWatchCard />
                </div>
                <div className="lg:col-span-2">
                  <UtilityAlertsWidget />
                </div>
              </div>

              {/* Row 2: Heat Index full width */}
              <div className="mb-5">
                <HeatIndexCard />
              </div>

              {/* Row 3: Traffic Map full width */}
              <div className="mb-5">
                <TrafficMap />
              </div>

              {/* Row 4: Traffic status | Emergency */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <TrafficCard />
                <EmergencyDirectory />
              </div>

              {/* Row 5: CSWDO full width */}
              <div className="mb-5">
                <CswdoServices />
              </div>
            </>
          )}

          {/* ── HEAT INDEX ────────────────────────────────────── */}
          {activeSection === 'heat-index' && (
            <>
              <SectionTitle>🌡️ Heat Index & Advisories — Iloilo City</SectionTitle>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                <HeatIndexCard />
                <HeatIndexNewsCard />
              </div>
              <div className="max-w-sm">
                <WeatherCard />
              </div>
            </>
          )}

          {/* ── FLOOD / RAIN MONITOR ──────────────────────────── */}
          {activeSection === 'flood-monitor' && (
            <>
              <SectionTitle>💧 Flood & Rain Gauge Monitor</SectionTitle>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                <RainGaugeCard />
                <TideCard />
              </div>
              <div className="mb-5">
                <TrafficMap />
              </div>
            </>
          )}

          {/* ── INCIDENT REPORTS ──────────────────────────────── */}
          {activeSection === 'incidents' && (
            <>
              <SectionTitle>📌 CDRRMO Incident Reports</SectionTitle>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                <IncidentReportForm />
                <IncidentList />
              </div>
              <div className="mb-5">
                <TrafficMap />
              </div>
            </>
          )}

          {/* ── TRAFFIC ───────────────────────────────────────── */}
          {activeSection === 'traffic' && (
            <>
              <SectionTitle>🚦 Traffic & Transport</SectionTitle>
              <div className="mb-5">
                <TrafficMap />
              </div>
              <TrafficCard />
            </>
          )}

          {/* ── WEATHER & TIDE ────────────────────────────────── */}
          {activeSection === 'weather' && (
            <>
              <SectionTitle>🌤️ Weather & Tide</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <WeatherCard />
                <HeatIndexCard />
                <TideCard />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <RainGaugeCard />
                <FuelWatchCard />
              </div>
            </>
          )}

          {/* ── UTILITIES ─────────────────────────────────────── */}
          {activeSection === 'utilities' && (
            <>
              <SectionTitle>⚡ Utility Advisories</SectionTitle>
              <div className="max-w-xl">
                <UtilityAlertsWidget />
              </div>
            </>
          )}

          {/* ── CSWDO ─────────────────────────────────────────── */}
          {activeSection === 'cswdo' && (
            <>
              <SectionTitle>🏛️ CSWDO Services</SectionTitle>
              <CswdoServices />
            </>
          )}

          {/* ── EMERGENCY ─────────────────────────────────────── */}
          {activeSection === 'emergency' && (
            <>
              <SectionTitle>📞 Emergency Directory</SectionTitle>
              <div className="max-w-xl">
                <EmergencyDirectory />
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-5">
      {children}
    </h1>
  )
}
