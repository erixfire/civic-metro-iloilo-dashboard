/**
 * AdminFuelSync — DOE sync status + manual entry form.
 * Manual Entry is always visible (not hidden behind a toggle) since DOE auto-sync
 * requires a separate cron worker deployment.
 */
import { useState, useEffect, useCallback } from 'react'

function getToken() { return localStorage.getItem('civic_admin_token') ?? '' }

const FUEL_FIELDS = [
  { key: 'as_of',               label: 'Date (as of)',        type: 'date',   ph: null },
  { key: 'iloilo_gasoline_avg', label: 'Iloilo Gasoline (₱)', type: 'number', ph: '65.80' },
  { key: 'iloilo_diesel_avg',   label: 'Iloilo Diesel (₱)',   type: 'number', ph: '46.20' },
  { key: 'iloilo_kerosene_avg', label: 'Iloilo Kerosene (₱)', type: 'number', ph: '64.10' },
  { key: 'ph_gasoline_avg',     label: 'PH Gasoline (₱)',     type: 'number', ph: '56.71' },
  { key: 'ph_diesel_avg',       label: 'PH Diesel (₱)',       type: 'number', ph: '43.10' },
]

export default function AdminFuelSync() {
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing,    setSyncing]    = useState(false)
  const [toast,      setToast]      = useState(null)
  const [showSync,   setShowSync]   = useState(false)   // collapse DOE sync panel

  const [fuel, setFuel] = useState({
    as_of:               new Date().toISOString().split('T')[0],
    iloilo_gasoline_avg: '',
    iloilo_diesel_avg:   '',
    iloilo_kerosene_avg: '',
    ph_gasoline_avg:     '',
    ph_diesel_avg:       '',
  })
  const [saving,  setSaving]  = useState(false)
  const [fuelMsg, setFuelMsg] = useState(null)   // { type: 'ok'|'err', text }

  function showToast(type, text) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 5000)
  }

  // Load last sync status — silently ignore if app_settings table not yet created
  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/fuel-prices/sync', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!r.ok) return   // 500 = table missing, just skip
      const d = await r.json()
      setSyncStatus(d.status ?? null)
    } catch { /* network error — ignore */ }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function triggerSync() {
    setSyncing(true)
    try {
      const r  = await fetch('/api/fuel-prices/sync', {
        method:  'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const d = await r.json()
      if (d.ok) {
        showToast('ok', `✅ Synced from ${d.source} — as of ${d.as_of}`)
      } else {
        showToast('warn', `⚠️ DOE unavailable — ${d.reason ?? 'enter prices manually below'}`)
      }
      loadStatus()
    } catch (e) {
      showToast('err', `❌ ${e.message}`)
    } finally { setSyncing(false) }
  }

  async function saveManual(e) {
    e.preventDefault()
    setFuelMsg(null)
    if (!fuel.iloilo_gasoline_avg || !fuel.iloilo_diesel_avg) {
      return setFuelMsg({ type: 'err', text: 'Gasoline and Diesel avg are required.' })
    }
    setSaving(true)
    try {
      const r = await fetch('/api/fuel-prices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ ...fuel, source: 'LPCC · Manual', logged_by: 'operator' }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${r.status}`)
      }
      setFuelMsg({ type: 'ok', text: '✅ Fuel prices saved to D1!' })
      // reset number fields, keep date
      setFuel(f => ({ ...f, iloilo_gasoline_avg: '', iloilo_diesel_avg: '', iloilo_kerosene_avg: '', ph_gasoline_avg: '', ph_diesel_avg: '' }))
    } catch (err) {
      setFuelMsg({ type: 'err', text: `❌ ${err.message}` })
    } finally { setSaving(false) }
  }

  const toastCls = toast?.type === 'ok'
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    : toast?.type === 'warn'
    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
    : 'bg-red-50 dark:bg-red-900/20 text-red-600'

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`text-xs font-semibold rounded-lg px-3 py-2 ${toastCls}`}>{toast.text}</div>
      )}

      {/* ---- Manual Entry (always visible) ---- */}
      <div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">✏️ Manual Entry — LPCC / DOE Data</div>
        <form onSubmit={saveManual} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FUEL_FIELDS.map(({ key, label, type, ph }) => (
              <div key={key}>
                <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                <input
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  min={type === 'number' ? '0' : undefined}
                  placeholder={ph ?? undefined}
                  value={fuel[key]}
                  onChange={e => setFuel(f => ({ ...f, [key]: e.target.value }))}
                  className="input-field"
                />
              </div>
            ))}
          </div>
          {fuelMsg && (
            <div className={`text-xs rounded-lg px-3 py-2 ${
              fuelMsg.type === 'ok'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600'
            }`}>{fuelMsg.text}</div>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : '💾 Save Fuel Prices'}
          </button>
        </form>
      </div>

      {/* ---- DOE Auto-Sync (collapsible) ---- */}
      <div className="border-t border-black/5 dark:border-white/5 pt-4">
        <button
          onClick={() => setShowSync(v => !v)}
          className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider hover:text-zinc-600 transition-colors">
          <span>🔄</span> DOE Auto-Sync
          <span className="ml-1">{showSync ? '▲' : '▼'}</span>
        </button>

        {showSync && (
          <div className="mt-3 space-y-3">
            {/* Status */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 px-4 py-3">
              {syncStatus?.ok ? (
                <div className="text-xs text-zinc-500 space-y-0.5">
                  <div>✅ Last synced: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{new Date(syncStatus.synced_at).toLocaleString('en-PH')}</span></div>
                  <div>As of: <span className="font-semibold">{syncStatus.as_of}</span> · Source: <span className="font-semibold">{syncStatus.source}</span></div>
                  {syncStatus.prices && (
                    <div className="flex gap-4 mt-1 font-semibold text-zinc-700 dark:text-zinc-200">
                      <span>⛽ ₱{syncStatus.prices.gasoline}/L</span>
                      <span>🛢️ ₱{syncStatus.prices.diesel}/L</span>
                      {syncStatus.prices.kerosene && <span>🕯️ ₱{syncStatus.prices.kerosene}/L</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-zinc-400">
                  {syncStatus?.reason ?? 'No sync performed yet. Cron runs every Tuesday 8AM PHT.'}
                </div>
              )}
            </div>

            <button
              onClick={triggerSync}
              disabled={syncing}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#01696f] text-white hover:bg-[#015459] transition-colors disabled:opacity-50">
              {syncing ? '⏳ Fetching from DOE…' : '🔄 Sync Now from DOE'}
            </button>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              Auto-cron: every <strong className="text-zinc-500">Tuesday 8:00 AM PHT</strong>
              — requires separate Worker deployment (see wrangler.toml)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
