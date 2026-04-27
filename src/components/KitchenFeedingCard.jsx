/**
 * KitchenFeedingCard
 * ──────────────────
 * CSWDO Community Kitchen Feeding Program report card.
 * Shows:
 *  - Today's KPI tiles (families fed, individuals, sites active)
 *  - 14-day trend bar chart (families + individuals)
 *  - Per-site breakdown bar chart (today)
 *  - Cumulative program totals vs targets
 *  - Operator log entry form
 */
import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import useKitchenStore from '../store/useKitchenStore'
import { KITCHEN_TARGETS, FEEDING_BY_SITE_TODAY } from '../data/communityKitchenConfig'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const MEALS_OPTIONS = [
  'Lunch & Merienda',
  'Breakfast & Lunch',
  'Breakfast, Lunch & Merienda',
  'Dinner',
  'All-Day Feeding',
]

function ProgressBar({ value, max, color = 'bg-brand-600' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function KpiTile({ label, value, unit = '', sub, color = 'text-brand-600' }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-4 py-3">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`tabular text-2xl font-bold ${color}`}>
        {value.toLocaleString()}{unit}
      </div>
      {sub && <div className="text-[11px] text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function KitchenFeedingCard() {
  const { feedingLog, siteBreakdown, addFeedingEntry, getTotals, getToday, getRecentLog } = useKitchenStore()
  const today     = getToday()
  const totals    = getTotals()
  const recentLog = getRecentLog(14)

  const targets  = KITCHEN_TARGETS
  const sites    = siteBreakdown ?? FEEDING_BY_SITE_TODAY
  const textColor = '#6b7280'
  const gridColor = 'rgba(0,0,0,0.06)'

  // ── 14-day trend chart ──────────────────────────────────────────────────────
  const trendData = {
    labels: recentLog.map((d) =>
      new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Individuals Fed',
        data: recentLog.map((d) => d.individuals),
        backgroundColor: 'rgba(1,105,111,0.75)',
        borderRadius: 4,
        order: 1,
      },
      {
        label: 'Families Served',
        data: recentLog.map((d) => d.families),
        backgroundColor: 'rgba(234,179,8,0.75)',
        borderRadius: 4,
        order: 2,
      },
    ],
  }

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor }, min: 0 },
    },
  }

  // ── Per-site breakdown chart ────────────────────────────────────────────────
  const siteData = {
    labels: sites.map((s) => s.siteName),
    datasets: [
      {
        label: 'Families',
        data: sites.map((s) => s.families),
        backgroundColor: 'rgba(234,179,8,0.80)',
        borderRadius: 4,
      },
      {
        label: 'Individuals',
        data: sites.map((s) => s.individuals),
        backgroundColor: 'rgba(1,105,111,0.75)',
        borderRadius: 4,
      },
    ],
  }

  const siteOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor }, min: 0 },
    },
  }

  // ── Operator form state ─────────────────────────────────────────────────────
  const todayISO = new Date().toISOString().split('T')[0]
  const [form, setForm]       = useState({ date: todayISO, families: '', individuals: '', sites: '', meals: 'Lunch & Merienda' })
  const [saved, setSaved]     = useState(false)
  const [formErr, setFormErr] = useState('')
  const [showForm, setShowForm] = useState(false)

  function setF(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.families || !form.individuals || !form.sites)
      return setFormErr('Please fill in Families, Individuals, and Sites fields.')
    if (isNaN(form.families) || isNaN(form.individuals) || isNaN(form.sites))
      return setFormErr('Families, Individuals, and Sites must be numbers.')
    setFormErr('')
    addFeedingEntry(form)
    setSaved(true)
    setTimeout(() => { setSaved(false); setShowForm(false) }, 2000)
  }

  const familyPct    = today ? Math.min(100, Math.round((today.families    / targets.dailyFamilyTarget)     * 100)) : 0
  const individualPct = today ? Math.min(100, Math.round((today.individuals / targets.dailyIndividualTarget) * 100)) : 0

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            🍲 Community Kitchen Feeding Report
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">{targets.programName}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 text-xs bg-brand-600 hover:bg-brand-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Log Entry'}
        </button>
      </div>

      {/* Operator form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-3">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Add Daily Feeding Log</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setF('date', e.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Families</label>
              <input type="number" min="0" placeholder="0" value={form.families} onChange={(e) => setF('families', e.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Individuals</label>
              <input type="number" min="0" placeholder="0" value={form.individuals} onChange={(e) => setF('individuals', e.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Sites Active</label>
              <input type="number" min="1" max="10" placeholder="0" value={form.sites} onChange={(e) => setF('sites', e.target.value)}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Meals Served</label>
            <select value={form.meals} onChange={(e) => setF('meals', e.target.value)}
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600">
              {MEALS_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {formErr && <div className="text-xs text-red-500">{formErr}</div>}
          {saved   && <div className="text-xs text-green-600">✅ Entry saved!</div>}
          <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg py-2 transition-colors">
            Save Entry
          </button>
        </form>
      )}

      {/* Today KPI tiles */}
      {today && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiTile label="Families Served Today" value={today.families} color="text-yellow-500"
            sub={`${familyPct}% of ${targets.dailyFamilyTarget} target`} />
          <KpiTile label="Individuals Fed Today" value={today.individuals} color="text-brand-600"
            sub={`${individualPct}% of ${targets.dailyIndividualTarget} target`} />
          <KpiTile label="Active Sites" value={today.sites} unit=" sites" color="text-green-600"
            sub="kitchen stations open" />
          <KpiTile label="Meals Served" value={today.meals?.split('&').length ?? 1} unit=" types"
            color="text-zinc-500" sub={today.meals} />
        </div>
      )}

      {/* Daily target progress */}
      {today && (
        <div className="mb-5 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-500">Families — Daily Target Progress</span>
              <span className="tabular font-semibold text-yellow-500">{today.families} / {targets.dailyFamilyTarget}</span>
            </div>
            <ProgressBar value={today.families} max={targets.dailyFamilyTarget} color="bg-yellow-400" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-500">Individuals — Daily Target Progress</span>
              <span className="tabular font-semibold text-brand-600">{today.individuals} / {targets.dailyIndividualTarget}</span>
            </div>
            <ProgressBar value={today.individuals} max={targets.dailyIndividualTarget} color="bg-brand-600" />
          </div>
        </div>
      )}

      {/* 14-day trend chart */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          📈 14-Day Feeding Trend
        </div>
        <div style={{ height: 200 }}>
          <Bar data={trendData} options={trendOptions} />
        </div>
      </div>

      {/* Per-site breakdown chart */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          📍 Today's Feeding by Site
        </div>
        <div style={{ height: 180 }}>
          <Bar data={siteData} options={siteOptions} />
        </div>
      </div>

      {/* Cumulative program totals */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-4 py-3 text-center">
          <div className="text-xs text-brand-500 font-medium uppercase tracking-wider mb-1">Total Families Served</div>
          <div className="tabular text-3xl font-bold text-brand-700 dark:text-brand-300">{totals.families.toLocaleString()}</div>
          <div className="text-[11px] text-brand-400 mt-0.5">since {targets.programStartDate}</div>
        </div>
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3 text-center">
          <div className="text-xs text-yellow-600 font-medium uppercase tracking-wider mb-1">Total Individuals Fed</div>
          <div className="tabular text-3xl font-bold text-yellow-700 dark:text-yellow-300">{totals.individuals.toLocaleString()}</div>
          <div className="text-[11px] text-yellow-500 mt-0.5">since {targets.programStartDate}</div>
        </div>
      </div>

      {/* Per-site table */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Site-by-Site Today</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="text-left py-1.5 text-zinc-400 font-medium">Site</th>
                <th className="text-right py-1.5 text-zinc-400 font-medium">Families</th>
                <th className="text-right py-1.5 text-zinc-400 font-medium">Individuals</th>
                <th className="text-right py-1.5 text-zinc-400 font-medium">Avg/Family</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.siteId} className="border-b border-black/5 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="py-1.5 font-medium text-zinc-700 dark:text-zinc-200">{s.siteName}</td>
                  <td className="py-1.5 text-right tabular text-yellow-500 font-semibold">{s.families}</td>
                  <td className="py-1.5 text-right tabular text-brand-600 font-semibold">{s.individuals}</td>
                  <td className="py-1.5 text-right tabular text-zinc-500">{(s.individuals / s.families).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-[11px] text-zinc-400 border-t border-black/5 dark:border-white/5 pt-3">
        Funding: {targets.fundingSource} · Program ends {targets.programEndDate}
      </div>
    </div>
  )
}
