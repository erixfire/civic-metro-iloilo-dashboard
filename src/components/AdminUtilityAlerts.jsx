/**
 * AdminUtilityAlerts — Add / deactivate utility alerts in Admin Panel
 */
import { useState, useEffect } from 'react'

const PROVIDERS  = ['MORE Power', 'MIWD', 'DPWH', 'Telco']
const SEVERITIES = ['info', 'warning', 'critical']
const TYPES      = ['outage', 'maintenance', 'advisory', 'restoration']

const SEV_STYLE = {
  info:     'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-300',
  warning:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  critical: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-300',
}

export default function AdminUtilityAlerts() {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [form, setForm] = useState({
    provider: 'MORE Power', type: 'outage', severity: 'warning',
    title: '', areas: '', start_dt: '', end_dt: '', reason: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/utility-alerts?all=1')
      const d = await r.json()
      setAlerts(d.alerts ?? [])
    } finally { setLoading(false) }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title) return
    await fetch('/api/utility-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setForm((f) => ({ ...f, title: '', areas: '', reason: '' }))
    load()
  }

  async function toggleActive(id, is_active) {
    await fetch('/api/utility-alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: is_active ? 0 : 1 }),
    })
    load()
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Provider</label>
          <select value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} className="input-field">
            {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input-field">
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Severity</label>
          <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} className="input-field">
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="label">Alert Title *</label>
          <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Scheduled power interruption — Lapaz district"
            className="input-field" />
        </div>
        <div>
          <label className="label">Areas Affected</label>
          <input value={form.areas} onChange={(e) => setForm((f) => ({ ...f, areas: e.target.value }))}
            placeholder="Lapaz, Jaro, Arevalo" className="input-field" />
        </div>
        <div>
          <label className="label">Start</label>
          <input type="datetime-local" value={form.start_dt} onChange={(e) => setForm((f) => ({ ...f, start_dt: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="label">End</label>
          <input type="datetime-local" value={form.end_dt} onChange={(e) => setForm((f) => ({ ...f, end_dt: e.target.value }))} className="input-field" />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="label">Reason / Details</label>
          <input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Maintenance of primary feeder line" className="input-field" />
        </div>
        {saved && <div className="col-span-3 text-xs text-green-600">✅ Alert saved!</div>}
        <button type="submit" className="btn-primary col-span-2 sm:col-span-3">Post Utility Alert to D1</button>
      </form>

      {/* Existing alerts */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {loading && <div className="text-xs text-zinc-400 animate-pulse">Loading…</div>}
        {alerts.map((a) => (
          <div key={a.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border border-black/5 dark:border-white/5 ${
            a.is_active ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-zinc-100/50 dark:bg-zinc-900 opacity-50'
          }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${SEV_STYLE[a.severity] ?? SEV_STYLE.info}`}>{a.severity}</span>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">{a.provider} — {a.title}</span>
              </div>
              {a.areas && <div className="text-[11px] text-zinc-400 mt-0.5">📍 {a.areas}</div>}
            </div>
            <button onClick={() => toggleActive(a.id, a.is_active)}
              className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                a.is_active
                  ? 'border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}>
              {a.is_active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
