/**
 * AdminPanel — Operator control center
 * Role-gated tabs: viewer sees read-only tabs only
 */
import { useState, useEffect } from 'react'
import useKitchenStore         from '../store/useKitchenStore'
import useIncidentStore        from '../store/useIncidentStore'
import AdminUtilityAlerts      from './AdminUtilityAlerts'
import AdminCmcCreate          from './AdminCmcCreate'
import AdminCmcManage          from './AdminCmcManage'
import AdminSettings           from './AdminSettings'
import AdminAuditLog           from './AdminAuditLog'
import AdminKitchenSites       from './AdminKitchenSites'
import AdminIncidents          from './AdminIncidents'
import AdminUserManagement     from './AdminUserManagement'
import AdminNotifications      from './AdminNotifications'
import AdminFuelSync           from './AdminFuelSync'
import AdminScraperPanel       from './AdminScraperPanel'

const ALL_TABS = [
  { id: 'overview',      label: '📊 Overview',       minRole: 'viewer'   },
  { id: 'incidents',     label: '📌 Incidents',       minRole: 'operator' },
  { id: 'utility',       label: '⚡ Utility Alerts',  minRole: 'operator' },
  { id: 'kitchen',       label: '🍲 Kitchen Sites',   minRole: 'operator' },
  { id: 'fuel',          label: '⛽ Fuel Prices',      minRole: 'operator' },
  { id: 'scraper',       label: '📡 News Scraper',    minRole: 'operator' },
  { id: 'cmc-manage',   label: '🏛️ CMC Manage',      minRole: 'operator' },
  { id: 'cmc-create',   label: '➕ CMC Create',       minRole: 'operator' },
  { id: 'notifications', label: '🔔 Push Alerts',     minRole: 'operator' },
  { id: 'settings',      label: '⚙️ Settings',        minRole: 'admin'    },
  { id: 'users',         label: '👥 Users',            minRole: 'admin'    },
  { id: 'audit',         label: '📋 Audit Log',        minRole: 'admin'    },
]

const ROLE_RANK = { admin: 3, operator: 2, viewer: 1 }
function canSee(tabMinRole, userRole) {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[tabMinRole] ?? 0)
}

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

export default function AdminPanel({ onNavigate, user, getToken, defaultTab }) {
  const role = user?.role ?? 'viewer'
  const visibleTabs = ALL_TABS.filter((t) => canSee(t.minRole, role))
  const [tab, setTab] = useState(defaultTab ?? visibleTabs[0]?.id ?? 'overview')

  const { getTotals, getToday, lastFetched, fetchData } = useKitchenStore()
  const { incidents, fetchIncidents }                   = useIncidentStore()
  const [dbStatus,   setDbStatus]   = useState('checking')
  const [heat,       setHeat]       = useState({ log_date: new Date().toISOString().split('T')[0], area: 'Iloilo City', heat_index_c: '', level: 'Extreme Caution' })
  const [heatSaved,  setHeatSaved]  = useState(false)
  const [heatSaving, setHeatSaving] = useState(false)

  useEffect(() => { fetchData(); fetchIncidents(); checkDb() }, [])

  async function checkDb() {
    try { const r = await fetch('/api/kitchen-feeding'); setDbStatus(r.ok ? 'ok' : 'error') } catch { setDbStatus('error') }
  }

  function authHeader() {
    const t = getToken?.()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function saveHeat(e) {
    e.preventDefault()
    if (!heat.heat_index_c) return
    setHeatSaving(true)
    try {
      await fetch('/api/heat-index', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(heat) })
      setHeatSaved(true); setTimeout(() => setHeatSaved(false), 3000)
    } finally { setHeatSaving(false) }
  }

  const totals = getTotals()
  const today  = getToday()
  const active = incidents.filter((i) => i.status === 'active').length

  return (
    <div className="space-y-5">

      {role === 'viewer' && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2">
          <span>👁️</span> You are in <strong>Viewer</strong> mode — read-only access.
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {visibleTabs.map((t) => (
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

          {role !== 'viewer' && (
            <AdminSection title="⚡ Quick Actions">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <QuickLink icon="📌" label="Incident Dashboard"  desc="Filter, bulk resolve, export CSV"  onClick={() => setTab('incidents')} />
                <QuickLink icon="🏛️" label="CMC Meeting Board"   desc="Status controls, action items"     onClick={() => setTab('cmc-manage')} />
                <QuickLink icon="⛽" label="Fuel Prices"         desc="DOE sync or manual LPCC entry"     onClick={() => setTab('fuel')} />
                <QuickLink icon="📡" label="News Scraper"        desc="Fetch live updates from all sources" onClick={() => setTab('scraper')} />
                <QuickLink icon="🔔" label="Push Notifications"  desc="Send alerts to all subscribers"   onClick={() => setTab('notifications')} />
                <QuickLink icon="⚡" label="Utility Alerts"      desc="Manage power/water notices"       onClick={() => setTab('utility')} />
                {role === 'admin' && <QuickLink icon="👥" label="User Management" desc="Add/deactivate operator accounts" onClick={() => setTab('users')} />}
              </div>
            </AdminSection>
          )}

          {role !== 'viewer' && (
            <AdminSection title="🌡️ Heat Index Entry — PAGASA">
              <form onSubmit={saveHeat} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><label className="block text-xs text-zinc-400 mb-1">Date</label>
                    <input type="date" value={heat.log_date} onChange={e=>setHeat(h=>({...h,log_date:e.target.value}))} className="input-field" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Area</label>
                    <select value={heat.area} onChange={e=>setHeat(h=>({...h,area:e.target.value}))} className="input-field">
                      {AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Heat Index (°C)</label>
                    <input type="number" step="0.1" placeholder="41" value={heat.heat_index_c} onChange={e=>setHeat(h=>({...h,heat_index_c:e.target.value}))} className="input-field" /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1">Level</label>
                    <select value={heat.level} onChange={e=>setHeat(h=>({...h,level:e.target.value}))} className="input-field">
                      {HEAT_LEVELS.map(l=><option key={l}>{l}</option>)}</select></div>
                </div>
                {heatSaved && <div className="text-xs text-green-600">✅ Heat index saved!</div>}
                <button type="submit" disabled={heatSaving} className="btn-primary">{heatSaving?'Saving…':'Save Heat Index'}</button>
              </form>
            </AdminSection>
          )}
        </>
      )}

      {tab === 'incidents'     && <AdminSection title="📌 Incident Management"><AdminIncidents /></AdminSection>}
      {tab === 'utility'       && <AdminSection title="⚡ Utility Alert Management"><AdminUtilityAlerts /></AdminSection>}
      {tab === 'kitchen'       && <AdminSection title="🍲 Kitchen Site Management"><AdminKitchenSites /></AdminSection>}
      {tab === 'fuel'          && <AdminSection title="⛽ Fuel Prices — DOE / LPCC"><AdminFuelSync /></AdminSection>}
      {tab === 'scraper'       && <AdminSection title="📡 News Scraper"><AdminScraperPanel getToken={getToken} /></AdminSection>}
      {tab === 'cmc-manage'   && <AdminSection title="🏛️ CMC Meeting Board"><AdminCmcManage /></AdminSection>}
      {tab === 'cmc-create'   && <AdminSection title="➕ Create New CMC Meeting"><AdminCmcCreate onSuccess={() => setTab('cmc-manage')} /></AdminSection>}
      {tab === 'notifications' && <AdminSection title="🔔 Push Notifications"><AdminNotifications /></AdminSection>}
      {tab === 'settings'      && role === 'admin' && <AdminSection title="⚙️ App Settings (D1)"><AdminSettings /></AdminSection>}
      {tab === 'users'         && role === 'admin' && <AdminSection title="👥 User Management"><AdminUserManagement /></AdminSection>}
      {tab === 'audit'         && role === 'admin' && <AdminSection title="📋 Audit Log"><AdminAuditLog /></AdminSection>}
    </div>
  )
}
