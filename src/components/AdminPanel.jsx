/**
 * AdminPanel — Operator control center
 * Sections:
 *  - Dashboard overview stats (live D1)
 *  - Quick links to all operator forms
 *  - D1 database status
 *  - Fuel price log entry
 *  - Utility alert management
 *  - Heat index manual entry
 *  - App settings (from D1 app_settings table)
 */
import { useState, useEffect } from 'react'
import useKitchenStore from '../store/useKitchenStore'
import useIncidentStore from '../store/useIncidentStore'

// ── Quick link card ─────────────────────────────────────────────────────
function QuickLink({ icon, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-brand-600 hover:shadow-md transition-all text-left w-full"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

// ── Section wrapper ──────────────────────────────────────────────────
function AdminSection({ title, children }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">{title}</div>
      {children}
    </div>
  )
}

export default function AdminPanel({ onNavigate }) {
  const { getTotals, getToday, lastFetched, fetchData } = useKitchenStore()
  const { incidents, fetchIncidents }                   = useIncidentStore()

  const [dbStatus,  setDbStatus]  = useState('checking')
  const [settings,  setSettings]  = useState([])
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved,  setSettingsSaved]  = useState(false)

  // ── Fuel price form
  const [fuel, setFuel] = useState({
    as_of: new Date().toISOString().split('T')[0],
    iloilo_gasoline_avg: '', iloilo_diesel_avg: '', iloilo_kerosene_avg: '',
    ph_gasoline_avg: '', ph_diesel_avg: '',
  })
  const [fuelSaved, setFuelSaved]   = useState(false)
  const [fuelError, setFuelError]   = useState('')
  const [fuelSaving, setFuelSaving] = useState(false)

  // ── Heat index form
  const [heat, setHeat] = useState({
    log_date: new Date().toISOString().split('T')[0],
    area: 'Iloilo City', heat_index_c: '', level: 'Extreme Caution',
  })
  const [heatSaved,  setHeatSaved]  = useState(false)
  const [heatSaving, setHeatSaving] = useState(false)

  useEffect(() => {
    fetchData()
    fetchIncidents()
    checkDb()
    loadSettings()
  }, [])

  async function checkDb() {
    try {
      const r = await fetch('/api/kitchen-feeding')
      setDbStatus(r.ok ? 'ok' : 'error')
    } catch { setDbStatus('error') }
  }

  async function loadSettings() {
    try {
      const r = await fetch('/api/settings')
      if (r.ok) { const d = await r.json(); setSettings(d.settings ?? []) }
    } catch (_) {}
  }

  async function saveFuel(e) {
    e.preventDefault()
    setFuelError('')
    if (!fuel.iloilo_gasoline_avg || !fuel.iloilo_diesel_avg)
      return setFuelError('Gasoline and Diesel averages are required.')
    setFuelSaving(true)
    try {
      const r = await fetch('/api/fuel-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fuel),
      })
      if (!r.ok) throw new Error('Save failed')
      setFuelSaved(true)
      setTimeout(() => setFuelSaved(false), 3000)
    } catch (e) { setFuelError(e.message) }
    finally { setFuelSaving(false) }
  }

  async function saveHeat(e) {
    e.preventDefault()
    if (!heat.heat_index_c) return
    setHeatSaving(true)
    try {
      await fetch('/api/heat-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heat),
      })
      setHeatSaved(true)
      setTimeout(() => setHeatSaved(false), 3000)
    } catch (_) {}
    finally { setHeatSaving(false) }
  }

  const totals  = getTotals()
  const today   = getToday()
  const active  = incidents.filter((i) => i.status === 'active').length

  const HEAT_LEVELS = ['Normal','Caution','Extreme Caution','Danger','Extreme Danger']
  const AREAS = ['Iloilo City','Dumangas, Iloilo','Lambunao, Iloilo','Pavia, Iloilo','Santa Barbara, Iloilo']

  return (
    <div className="space-y-5">

      {/* ── Live Stats Overview */}
      <AdminSection title="📊 Live D1 Stats">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Families Fed Today"   value={today?.families   ?? '—'} color="text-yellow-500" />
          <StatTile label="Individuals Today"    value={today?.individuals ?? '—'} color="text-brand-600" />
          <StatTile label="Total Families Served" value={totals.families.toLocaleString()} color="text-brand-600" />
          <StatTile label="Active Incidents"     value={active}            color={active > 0 ? 'text-red-500' : 'text-green-500'} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
          <span className={`inline-block w-2 h-2 rounded-full ${ dbStatus === 'ok' ? 'bg-green-500' : 'bg-red-500' }`} />
          D1 Database: <span className={dbStatus === 'ok' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{dbStatus === 'ok' ? 'Connected' : 'Error'}</span>
          {lastFetched && <span className="ml-auto">Last sync: {new Date(lastFetched).toLocaleTimeString('en-PH')}</span>}
        </div>
      </AdminSection>

      {/* ── Quick Links */}
      <AdminSection title="⚡ Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickLink icon="🏛️" label="CMC Meeting Board" desc="Meetings, action items, dept updates" onClick={() => onNavigate('cmc')} />
          <QuickLink icon="🍲" label="Log Kitchen Feeding" desc="Post today’s CSWDO kitchen figures" onClick={() => onNavigate('community-kitchen')} />
          <QuickLink icon="📌" label="Report Incident"    desc="Submit new CDRRMO incident"          onClick={() => onNavigate('incidents')} />
          <QuickLink icon="⚡" label="Utility Alerts"   desc="Manage MORE Power / MIWD notices"    onClick={() => onNavigate('utilities')} />
          <QuickLink icon="⛽" label="Fuel Prices"      desc="Log latest LPCC/DOE fuel prices"     onClick={null} />
          <QuickLink icon="🌡️" label="Heat Index Entry" desc="Log daily PAGASA heat index"         onClick={null} />
        </div>
      </AdminSection>

      {/* ── Fuel Price Entry */}
      <AdminSection title="⛽ Fuel Price Log — LPCC/DOE">
        <form onSubmit={saveFuel} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date</label>
              <input type="date" value={fuel.as_of} onChange={(e) => setFuel((f) => ({ ...f, as_of: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Iloilo Gasoline Avg (₱)</label>
              <input type="number" step="0.01" placeholder="65.80" value={fuel.iloilo_gasoline_avg}
                onChange={(e) => setFuel((f) => ({ ...f, iloilo_gasoline_avg: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Iloilo Diesel Avg (₱)</label>
              <input type="number" step="0.01" placeholder="46.20" value={fuel.iloilo_diesel_avg}
                onChange={(e) => setFuel((f) => ({ ...f, iloilo_diesel_avg: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Iloilo Kerosene Avg (₱)</label>
              <input type="number" step="0.01" placeholder="64.10" value={fuel.iloilo_kerosene_avg}
                onChange={(e) => setFuel((f) => ({ ...f, iloilo_kerosene_avg: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">PH Gasoline Avg (₱)</label>
              <input type="number" step="0.01" placeholder="56.71" value={fuel.ph_gasoline_avg}
                onChange={(e) => setFuel((f) => ({ ...f, ph_gasoline_avg: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">PH Diesel Avg (₱)</label>
              <input type="number" step="0.01" placeholder="43.10" value={fuel.ph_diesel_avg}
                onChange={(e) => setFuel((f) => ({ ...f, ph_diesel_avg: e.target.value }))}
                className="input-field" />
            </div>
          </div>
          {fuelError && <div className="text-xs text-red-500">{fuelError}</div>}
          {fuelSaved && <div className="text-xs text-green-600">✅ Fuel prices saved to D1!</div>}
          <button type="submit" disabled={fuelSaving}
            className="btn-primary">
            {fuelSaving ? 'Saving…' : 'Save Fuel Prices to D1'}
          </button>
        </form>
      </AdminSection>

      {/* ── Heat Index Entry */}
      <AdminSection title="🌡️ Heat Index Manual Entry — PAGASA">
        <form onSubmit={saveHeat} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date</label>
              <input type="date" value={heat.log_date} onChange={(e) => setHeat((h) => ({ ...h, log_date: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Area</label>
              <select value={heat.area} onChange={(e) => setHeat((h) => ({ ...h, area: e.target.value }))}
                className="input-field">
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Heat Index (°C)</label>
              <input type="number" step="0.1" placeholder="41" value={heat.heat_index_c}
                onChange={(e) => setHeat((h) => ({ ...h, heat_index_c: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Level</label>
              <select value={heat.level} onChange={(e) => setHeat((h) => ({ ...h, level: e.target.value }))}
                className="input-field">
                {HEAT_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          {heatSaved && <div className="text-xs text-green-600">✅ Heat index saved to D1!</div>}
          <button type="submit" disabled={heatSaving} className="btn-primary">
            {heatSaving ? 'Saving…' : 'Save Heat Index to D1'}
          </button>
        </form>
      </AdminSection>

      {/* ── App Settings */}
      {settings.length > 0 && (
        <AdminSection title="⚙️ App Settings (D1)">
          <div className="space-y-2">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500 w-48 shrink-0 font-mono">{s.key}</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{s.value}</span>
                {s.description && <span className="text-zinc-400">— {s.description}</span>}
              </div>
            ))}
          </div>
        </AdminSection>
      )}

    </div>
  )
}

function StatTile({ label, value, color }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-4 py-3">
      <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`tabular text-xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
