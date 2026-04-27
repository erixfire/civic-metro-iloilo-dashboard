/**
 * AdminFuelSync — shows last DOE sync status + manual trigger button.
 * Replaces the plain fuel form in AdminPanel overview when sync is active.
 */
import { useState, useEffect, useCallback } from 'react'

function getToken() { return localStorage.getItem('civic_admin_token') ?? '' }

const SOURCE_BADGE = {
  'DOE · data.gov.ph':    { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  icon: '✅' },
  'DOE · oil.doe.gov.ph':  { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  icon: '✅' },
  'DOE · opendata.gov.ph': { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',    icon: '🔵' },
  manual:                  { cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',         icon: '✏️' },
}
function getBadge(source) {
  if (!source) return SOURCE_BADGE.manual
  const key = Object.keys(SOURCE_BADGE).find((k) => source.includes(k.split('·')[1]?.trim() ?? k))
  return SOURCE_BADGE[key] ?? SOURCE_BADGE.manual
}

const FUEL_FIELDS = [
  { key: 'as_of',               label: 'Date',               type: 'date',   ph: null },
  { key: 'iloilo_gasoline_avg', label: 'Iloilo Gasoline (₱)', type: 'number', ph: '65.80' },
  { key: 'iloilo_diesel_avg',   label: 'Iloilo Diesel (₱)',   type: 'number', ph: '46.20' },
  { key: 'iloilo_kerosene_avg', label: 'Iloilo Kerosene (₱)',type: 'number', ph: '64.10' },
  { key: 'ph_gasoline_avg',     label: 'PH Gasoline (₱)',    type: 'number', ph: '56.71' },
  { key: 'ph_diesel_avg',       label: 'PH Diesel (₱)',      type: 'number', ph: '43.10' },
]

export default function AdminFuelSync() {
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing,    setSyncing]    = useState(false)
  const [toast,      setToast]      = useState('')

  // Manual override form
  const [showForm,   setShowForm]   = useState(false)
  const [fuel, setFuel] = useState({ as_of: new Date().toISOString().split('T')[0], iloilo_gasoline_avg: '', iloilo_diesel_avg: '', iloilo_kerosene_avg: '', ph_gasoline_avg: '', ph_diesel_avg: '' })
  const [saving,  setSaving]  = useState(false)
  const [fuelErr, setFuelErr] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/fuel-prices/sync', { headers: { Authorization: `Bearer ${getToken()}` } })
      const d = await r.json()
      setSyncStatus(d.status)
    } catch { setSyncStatus(null) }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function triggerSync() {
    setSyncing(true)
    try {
      const r = await fetch('/api/fuel-prices/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const d = await r.json()
      if (d.ok) {
        showToast(`✅ Synced from ${d.source} — as of ${d.as_of}`)
      } else {
        showToast(`⚠️ DOE sources unavailable — ${d.reason ?? 'please enter manually'}`)
        setShowForm(true)
      }
      await loadStatus()
    } catch (e) {
      showToast(`❌ Sync error: ${e.message}`)
    } finally { setSyncing(false) }
  }

  async function saveManual(e) {
    e.preventDefault(); setFuelErr('')
    if (!fuel.iloilo_gasoline_avg || !fuel.iloilo_diesel_avg) return setFuelErr('Gasoline and Diesel are required.')
    setSaving(true)
    try {
      const r = await fetch('/api/fuel-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...fuel, source: 'LPCC · Manual', logged_by: 'operator' }),
      })
      if (!r.ok) throw new Error('Save failed')
      showToast('✅ Fuel prices saved manually')
      setShowForm(false)
      loadStatus()
    } catch (err) { setFuelErr(err.message) } finally { setSaving(false) }
  }

  const badge = getBadge(syncStatus?.source)

  return (
    <div className="space-y-4">
      {toast && <div className="text-xs font-semibold text-green-600 dark:text-green-400">{toast}</div>}

      {/* Sync status card */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 flex items-start gap-4">
        <span className="text-2xl mt-0.5">⛽</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">DOE Fuel Price Sync</span>
            {syncStatus?.source && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                {badge.icon} {syncStatus.source}
              </span>
            )}
          </div>
          {syncStatus?.ok ? (
            <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
              <div>Last synced: <span className="font-semibold text-zinc-600 dark:text-zinc-300">{new Date(syncStatus.synced_at).toLocaleString('en-PH')}</span></div>
              <div>As of: <span className="font-semibold">{syncStatus.as_of}</span> · by <span className="font-semibold">{syncStatus.triggered_by}</span></div>
              {syncStatus.prices && (
                <div className="flex gap-3 mt-1">
                  <span>⛽ <span className="font-semibold text-zinc-700 dark:text-zinc-200">₱{syncStatus.prices.gasoline}</span>/L</span>
                  <span>🛢️ <span className="font-semibold text-zinc-700 dark:text-zinc-200">₱{syncStatus.prices.diesel}</span>/L</span>
                  {syncStatus.prices.kerosene && <span>🕯️ <span className="font-semibold">₱{syncStatus.prices.kerosene}</span>/L</span>}
                </div>
              )}
            </div>
          ) : syncStatus ? (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">⚠️ {syncStatus.reason ?? 'Last sync failed — using manual data'}</div>
          ) : (
            <div className="text-xs text-zinc-400 mt-1">No sync performed yet — click Sync Now to fetch from DOE.</div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={triggerSync} disabled={syncing}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#01696f] text-white hover:bg-[#015459] transition-colors disabled:opacity-50">
            {syncing ? '⏳ Syncing…' : '🔄 Sync Now'}
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-zinc-500 hover:border-zinc-400 transition-colors">
            {showForm ? 'Hide Form' : '✏️ Manual Entry'}
          </button>
        </div>
      </div>

      {/* Cron schedule info */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
        Auto-syncs every <strong className="text-zinc-500">Tuesday 8:00 AM PHT</strong> from DOE Western Visayas data.
        Manual entry overrides auto-sync for the same date.
      </div>

      {/* Manual override form */}
      {showForm && (
        <form onSubmit={saveManual} className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Manual Override — LPCC / DOE</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FUEL_FIELDS.map(({ key, label, type, ph }) => (
              <div key={key}>
                <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                <input type={type} step={type === 'number' ? '0.01' : undefined}
                  placeholder={ph} value={fuel[key]}
                  onChange={e => setFuel(f => ({ ...f, [key]: e.target.value }))}
                  className="input-field" />
              </div>
            ))}
          </div>
          {fuelErr && <div className="text-xs text-red-500">{fuelErr}</div>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Manual Prices'}
          </button>
        </form>
      )}
    </div>
  )
}
