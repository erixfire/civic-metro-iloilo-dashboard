/**
 * AdminKitchenDashboard — Community Kitchen reporting & stats for Admin Panel
 * Shows: program summary, cumulative totals, daily feeding log table,
 * per-site breakdown today, and a form to log a new daily entry.
 */
import { useState, useEffect } from 'react'
import useKitchenStore from '../store/useKitchenStore'

const MEAL_TYPES = ['Breakfast','Lunch','Dinner','Breakfast & Lunch','Lunch & Dinner','All Meals']

export default function AdminKitchenDashboard({ getToken }) {
  const {
    feedingLog, siteBreakdown, program, totals,
    loading, error, lastFetched,
    fetchData, addFeedingEntry, getTargets,
  } = useKitchenStore()

  const [days,    setDays]    = useState(14)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [formErr, setFormErr] = useState('')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    families: '', individuals: '', sites: '', meals: 'Lunch', logged_by: '',
  })

  useEffect(() => { fetchData(days) }, [days])

  function authHeader() {
    const t = getToken?.()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function handleLog(e) {
    e.preventDefault()
    setFormErr('')
    if (!form.date || !form.families || !form.individuals)
      return setFormErr('Date, families, and individuals are required.')
    setSaving(true)
    try {
      await addFeedingEntry({ ...form }, authHeader())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setForm(f => ({ ...f, families: '', individuals: '', sites: '', logged_by: '' }))
    } catch (err) {
      setFormErr(err.message)
    } finally { setSaving(false) }
  }

  const targets  = getTargets()
  const recentLog = [...feedingLog].reverse().slice(0, days)
  const today    = feedingLog[feedingLog.length - 1] ?? null
  const pctFam   = targets.dailyFamilyTarget
    ? Math.min(100, Math.round(((today?.families ?? 0) / targets.dailyFamilyTarget) * 100))
    : null

  return (
    <div className="space-y-6">

      {/* ── Program Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
            🍲 {targets.programName ?? 'Community Kitchen Program'}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {targets.programStartDate && targets.programEndDate
              ? `${targets.programStartDate} – ${targets.programEndDate}`
              : 'Iloilo City CSWDO'}
            {targets.fundingSource ? ` · ${targets.fundingSource}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400">Show last</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-field !w-auto text-xs">
            {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
          <button onClick={() => fetchData(days)} className="btn-secondary !w-auto text-xs px-3">↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-4 py-2">
          ⚠️ Using cached/demo data — {error}
        </div>
      )}

      {/* ── Cumulative Stats ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Families Served" value={totals.families.toLocaleString()} color="text-[#01696f]" icon="👨‍👩‍👧" />
        <StatCard label="Total Individuals" value={totals.individuals.toLocaleString()} color="text-blue-600" icon="👤" />
        <StatCard label="Days Operational" value={totals.total_days || feedingLog.length} color="text-purple-600" icon="📅" />
        <StatCard label="Today’s Families" value={today?.families ?? '—'} color={pctFam !== null && pctFam >= 90 ? 'text-green-600' : 'text-orange-500'} icon="🍲" />
      </div>

      {/* Daily target progress bar */}
      {targets.dailyFamilyTarget && today && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Today vs daily target ({targets.dailyFamilyTarget.toLocaleString()} families)</span>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">{pctFam}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${ pctFam >= 100 ? 'bg-green-500' : pctFam >= 75 ? 'bg-[#01696f]' : 'bg-orange-400' }`}
              style={{ width: `${pctFam}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Site Breakdown Today ─────────────────────────────── */}
      {siteBreakdown.length > 0 && (
        <div>
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Site Breakdown — Today</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {siteBreakdown.map((s, i) => (
              <div key={s.siteId ?? i}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">{s.siteName}</div>
                  {s.district && <div className="text-[10px] text-zinc-400">{s.district}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-[#01696f]">{(s.families ?? 0).toLocaleString()}</div>
                  <div className="text-[10px] text-zinc-400">families</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Daily Log Table ───────────────────────────────────── */}
      <div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Daily Feeding Log</div>
        {loading && (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
          </div>
        )}
        {!loading && recentLog.length === 0 && (
          <div className="text-xs text-zinc-400 text-center py-8">No log entries found.</div>
        )}
        {!loading && recentLog.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-zinc-400 uppercase tracking-wider text-left">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Families</th>
                  <th className="pb-2 pr-4">Individuals</th>
                  <th className="pb-2 pr-4">Sites Active</th>
                  <th className="pb-2 pr-4">Meal</th>
                  <th className="pb-2">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {recentLog.map((row, i) => (
                  <tr key={row.id ?? i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-2 pr-4 font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                      {row.date ?? row.log_date}
                    </td>
                    <td className="py-2 pr-4 tabular font-semibold text-[#01696f]">{(row.families ?? 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 tabular">{(row.individuals ?? 0).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-zinc-500">{row.sites_active ?? row.sites ?? '—'}</td>
                    <td className="py-2 pr-4 text-zinc-500">{row.meals ?? '—'}</td>
                    <td className="py-2 text-zinc-400">{row.logged_by ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lastFetched && (
          <div className="text-[10px] text-zinc-400 mt-2">
            Last synced: {new Date(lastFetched).toLocaleString('en-PH')}
          </div>
        )}
      </div>

      {/* ── Log New Entry Form ────────────────────────────────── */}
      <div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Log New Daily Entry</div>
        <form onSubmit={handleLog} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="label">Date <span className="text-red-400">*</span></label>
              <input type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="label">Families Served <span className="text-red-400">*</span></label>
              <input type="number" min="0" required value={form.families}
                placeholder="e.g. 1200"
                onChange={e => setForm(f => ({ ...f, families: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="label">Individuals Served <span className="text-red-400">*</span></label>
              <input type="number" min="0" required value={form.individuals}
                placeholder="e.g. 5400"
                onChange={e => setForm(f => ({ ...f, individuals: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="label">Sites Active</label>
              <input type="number" min="0" value={form.sites}
                placeholder="e.g. 12"
                onChange={e => setForm(f => ({ ...f, sites: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="label">Meal Type</label>
              <select value={form.meals}
                onChange={e => setForm(f => ({ ...f, meals: e.target.value }))}
                className="input-field">
                {MEAL_TYPES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Logged By</label>
              <input value={form.logged_by}
                placeholder="CSWDO Operator"
                onChange={e => setForm(f => ({ ...f, logged_by: e.target.value }))}
                className="input-field" />
            </div>
          </div>
          {formErr && <div className="text-xs text-red-500">⚠️ {formErr}</div>}
          {saved   && <div className="text-xs text-green-600">✅ Entry logged successfully!</div>}
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Saving…' : '🍲 Log Feeding Entry'}
          </button>
        </form>
      </div>

    </div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-4 py-3">
      <div className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1">{icon} {label}</div>
      <div className={`tabular text-xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
