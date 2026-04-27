/**
 * AdminPanel — Operator control center
 * Tabs: Overview | Incidents | Utility Alerts | Kitchen Sites | CMC | Settings | Audit Log
 */
import { useState, useEffect } from 'react'
import useKitchenStore  from '../store/useKitchenStore'
import useIncidentStore from '../store/useIncidentStore'
import AdminUtilityAlerts from './AdminUtilityAlerts'
import AdminCmcCreate     from './AdminCmcCreate'
import AdminSettings      from './AdminSettings'
import AdminAuditLog      from './AdminAuditLog'
import AdminKitchenSites  from './AdminKitchenSites'
import AdminIncidents     from './AdminIncidents'

const TABS = [
  { id: 'overview',   label: '📊 Overview'        },
  { id: 'incidents',  label: '📌 Incidents'        },
  { id: 'utility',    label: '⚡ Utility Alerts'   },
  { id: 'kitchen',    label: '🍲 Kitchen Sites'    },
  { id: 'cmc',        label: '🏛️ CMC'              },
  { id: 'settings',   label: '⚙️ Settings'         },
  { id: 'audit',      label: '📋 Audit Log'        },
]

const AREAS       = ['Iloilo City','Dumangas, Iloilo','Lambunao, Iloilo','Pavia, Iloilo','Santa Barbara, Iloilo']
const HEAT_LEVELS = ['Normal','Caution','Extreme Caution','Danger','Extreme Danger']

function AdminSection({ title, children }) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">{title}</div>
      {children}
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

function QuickLink({ icon, label, desc, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-[#01696f] hover:shadow-md transition-all text-left w-full">
      <span className="text-2xl shrink-0">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

export default function AdminPanel({ onNavigate }) {
  const [tab, setTab] = useState('overview')

  const { getTotals, getToday, lastFetched, fetchData } = useKitchenStore()
  const { incidents, fetchIncidents }                   = useIncidentStore()

  const [dbStatus, setDbStatus] = useState('checking')

  const [fuel, setFuel] = useState({
    as_of: new Date().toISOString().split('T')[0],
    iloilo_gasoline_avg: '', iloilo_diesel_avg: '',
    iloilo_kerosene_avg: '', ph_gasoline_avg: '', ph_diesel_avg: '',
  })
  const [fuelSaved,  setFuelSaved]  = useState(false)
  const [fuelError,  setFuelError]  = useState('')
  const [fuelSaving, setFuelSaving] = useState(false)

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
  }, [])

  async function checkDb() {
    try { const r = await fetch('/api/kitchen-feeding'); setDbStatus(r.ok ? 'ok' : 'error') }
    catch { setDbStatus('error') }
  }

  async function saveFuel(e) {
    e.preventDefault(); setFuelError('')
    if (!fuel.iloilo_gasoline_avg || !fuel.iloilo_diesel_avg)
      return setFuelError('Gasoline and Diesel are required.')
    setFuelSaving(true)
    try {
      const r = await fetch('/api/fuel-prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fuel) })
      if (!r.ok) throw new Error('Save failed')
      setFuelSaved(true); setTimeout(() => setFuelSaved(false), 3000)
    } catch (e) { setFuelError(e.message) }
    finally { setFuelSaving(false) }
  }

  async function saveHeat(e) {
    e.preventDefault()
    if (!heat.heat_index_c) return
    setHeatSaving(true)
    try {
      await fetch('/api/heat-index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(heat) })
      setHeatSaved(true); setTimeout(() => setHeatSaved(false), 3000)
    } finally { setHeatSaving(false) }
  }

  const totals = getTotals()
  const today  = getToday()
  const active = incidents.filter((i) => i.status === 'active').length

  return (
    <div className="space-y-5">

      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-colors ${
              tab === t.id
                ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-700 dark:border-zinc-600'
                : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-black/10 dark:border-white/10 hover:border-zinc-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <AdminSection title="📊 Live D1 Stats">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Families Fed Today"    value={today?.families    ?? '—'} color="text-yellow-500" />
              <StatTile label="Individuals Today"     value={today?.individuals ?? '—'} color="text-[#01696f]" />
              <StatTile label="Total Families Served" value={totals.families.toLocaleString()} color="text-[#01696f]" />
              <StatTile label="Active Incidents"      value={active} color={active > 0 ? 'text-red-500' : 'text-green-500'} />
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
              <span className={`w-2 h-2 rounded-full inline-block ${ dbStatus === 'ok' ? 'bg-green-500' : 'bg-red-500' }`} />
              D1: <span className={dbStatus === 'ok' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{dbStatus === 'ok' ? 'Connected' : 'Error'}</span>
              {lastFetched && <span className="ml-auto">Synced {new Date(lastFetched).toLocaleTimeString('en-PH')}</span>}
            </div>
          </AdminSection>

          <AdminSection title="⚡ Quick Actions">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickLink icon="📌" label="Incident Dashboard"  desc="Filter, bulk resolve, export CSV"  onClick={() => setTab('incidents')} />
              <QuickLink icon="🏛️" label="CMC Meetings"        desc="View board, action items"         onClick={() => onNavigate('cmc')} />
              <QuickLink icon="🍲" label="Log Kitchen Feeding"   desc="Post today’s CSWDO figures"      onClick={() => onNavigate('community-kitchen')} />
              <QuickLink icon="⚡" label="Utility Alerts"       desc="Manage power/water notices"       onClick={() => setTab('utility')} />
              <QuickLink icon="🍲" label="Kitchen Sites"        desc="Add/manage feeding stations"      onClick={() => setTab('kitchen')} />
              <QuickLink icon="⚙️" label="App Settings"        desc="Edit dashboard config"           onClick={() => setTab('settings')} />
            </div>
          </AdminSection>

          <AdminSection title="⛽ Fuel Price Log — LPCC/DOE">
            <form onSubmit={saveFuel} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[['as_of','Date','date',null],['iloilo_gasoline_avg','Iloilo Gasoline (₱)','number','65.80'],['iloilo_diesel_avg','Iloilo Diesel (₱)','number','46.20'],['iloilo_kerosene_avg','Iloilo Kerosene (₱)','number','64.10'],['ph_gasoline_avg','PH Gasoline (₱)','number','56.71'],['ph_diesel_avg','PH Diesel (₱)','number','43.10']].map(([key,label,type,ph]) => (
                  <div key={key}>
                    <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                    <input type={type} step={type === 'number' ? '0.01' : undefined}
                      placeholder={ph} value={fuel[key]}
                      onChange={(e) => setFuel((f) => ({ ...f, [key]: e.target.value }))}
                      className="input-field" />
                  </div>
                ))}
              </div>
              {fuelError && <div className="text-xs text-red-500">{fuelError}</div>}
              {fuelSaved && <div className="text-xs text-green-600">✅ Fuel prices saved to D1!</div>}
              <button type="submit" disabled={fuelSaving} className="btn-primary">
                {fuelSaving ? 'Saving…' : 'Save Fuel Prices'}
              </button>
            </form>
          </AdminSection>

          <AdminSection title="🌡️ Heat Index Entry — PAGASA">
            <form onSubmit={saveHeat} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label className="block text-xs text-zinc-400 mb-1">Date</label>
                  <input type="date" value={heat.log_date} onChange={(e) => setHeat((h) => ({ ...h, log_date: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Area</label>
                  <select value={heat.area} onChange={(e) => setHeat((h) => ({ ...h, area: e.target.value }))} className="input-field">
                    {AREAS.map((a) => <option key={a}>{a}</option>)}</select></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Heat Index (°C)</label>
                  <input type="number" step="0.1" placeholder="41" value={heat.heat_index_c}
                    onChange={(e) => setHeat((h) => ({ ...h, heat_index_c: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1">Level</label>
                  <select value={heat.level} onChange={(e) => setHeat((h) => ({ ...h, level: e.target.value }))} className="input-field">
                    {HEAT_LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
              </div>
              {heatSaved && <div className="text-xs text-green-600">✅ Heat index saved!</div>}
              <button type="submit" disabled={heatSaving} className="btn-primary">
                {heatSaving ? 'Saving…' : 'Save Heat Index'}
              </button>
            </form>
          </AdminSection>
        </>
      )}

      {tab === 'incidents' && (
        <AdminSection title="📌 Incident Management">
          <AdminIncidents />
        </AdminSection>
      )}

      {tab === 'utility' && (
        <AdminSection title="⚡ Utility Alert Management"><AdminUtilityAlerts /></AdminSection>
      )}

      {tab === 'kitchen' && (
        <AdminSection title="🍲 Kitchen Site Management"><AdminKitchenSites /></AdminSection>
      )}

      {tab === 'cmc' && (
        <AdminSection title="🏛️ Create New CMC Meeting">
          <AdminCmcCreate onSuccess={() => onNavigate('cmc')} />
        </AdminSection>
      )}

      {tab === 'settings' && (
        <AdminSection title="⚙️ App Settings (D1)"><AdminSettings /></AdminSection>
      )}

      {tab === 'audit' && (
        <AdminSection title="📋 Audit Log"><AdminAuditLog /></AdminSection>
      )}
    </div>
  )
}
