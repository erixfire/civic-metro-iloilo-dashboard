/**
 * AdminIncidents — Full incident management table for Admin Panel
 * Features: filter by type/district/status (including pending), select all,
 *   bulk approve/reject/resolve/delete, CSV export, stats bar, moderation queue badge.
 * Fix: Authorization header now sent on all PATCH requests via getToken prop.
 */
import { useState, useEffect, useCallback } from 'react'

const TYPES      = ['all','flood','fire','landslide','accident','medical','crime','infrastructure','other']
const DISTRICTS  = ['all','City Proper','Arevalo','Jaro','La Paz','Lapuz','Mandurriao','Molo','Rizal']
const STATUSES   = ['all','pending','active','resolved','rejected']
const SEVERITIES = { critical: 'text-red-600', high: 'text-orange-500', moderate: 'text-yellow-500', low: 'text-green-600' }

const TYPE_ICON = {
  flood: '🌊', fire: '🔥', landslide: '⛰️', accident: '🚗',
  medical: '🏥', crime: '🚨', infrastructure: '🚧', other: '📌', traffic: '🚖',
}

const STATUS_BADGE = {
  active:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  rejected: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export default function AdminIncidents({ getToken }) {
  const [incidents, setIncidents] = useState([])
  const [summary,   setSummary]   = useState({})
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(new Set())
  const [bulkBusy,  setBulkBusy]  = useState(false)
  const [toast,     setToast]     = useState('')

  const [filters, setFilters] = useState({ status: 'all', type: 'all', district: 'all', days: '30' })

  function authHeader() {
    const t = getToken?.()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const p = new URLSearchParams()
      if (filters.status   !== 'all') p.set('status',   filters.status)
      if (filters.type     !== 'all') p.set('type',     filters.type)
      if (filters.district !== 'all') p.set('district', filters.district)
      p.set('days', filters.days)

      const r = await fetch(`/api/incidents?${p}`, { headers: authHeader() })
      const d = await r.json()
      setIncidents(d.incidents ?? [])
      setSummary(d.summary ?? {})
    } finally { setLoading(false) }
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  function showToast(msg, isError = false) {
    setToast({ msg, isError })
    setTimeout(() => setToast(''), 3500)
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === incidents.length) setSelected(new Set())
    else setSelected(new Set(incidents.map((i) => i.id)))
  }

  async function bulkAction(action) {
    if (selected.size === 0) return
    const confirmed = action === 'delete'
      ? window.confirm(`Delete ${selected.size} incident(s)? This cannot be undone.`)
      : true
    if (!confirmed) return
    setBulkBusy(true)
    try {
      const r = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ ids: [...selected], action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      const verb = { approve: 'Approved', reject: 'Rejected', resolve: 'Resolved', delete: 'Deleted' }[action] ?? action
      showToast(`✅ ${verb} ${d.affected} incident(s)`)
      load()
    } catch (e) {
      showToast(`❌ Failed: ${e.message}`, true)
    } finally { setBulkBusy(false) }
  }

  async function singleAction(id, action) {
    try {
      const r = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ id, action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      load()
    } catch (e) {
      showToast(`❌ Failed: ${e.message}`, true)
    }
  }

  function exportCSV() {
    const p = new URLSearchParams()
    if (filters.status   !== 'all') p.set('status',   filters.status)
    if (filters.type     !== 'all') p.set('type',     filters.type)
    if (filters.district !== 'all') p.set('district', filters.district)
    p.set('days', filters.days)
    p.set('format', 'csv')
    window.open(`/api/incidents?${p}`, '_blank')
  }

  const allSelected = incidents.length > 0 && selected.size === incidents.length
  const hasPending  = incidents.some((i) => i.status === 'pending')

  return (
    <div className="space-y-4">

      {/* Moderation queue notice */}
      {(summary.pending ?? 0) > 0 && filters.status !== 'pending' && (
        <button
          onClick={() => setFilters((f) => ({ ...f, status: 'pending' }))}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 text-xs font-semibold hover:bg-yellow-100 transition-colors"
        >
          <span className="text-base">⏳</span>
          <span>{summary.pending} incident{summary.pending > 1 ? 's' : ''} pending review — click to moderate</span>
          <span className="ml-auto">→</span>
        </button>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-2.5">
          <div className="text-[11px] text-yellow-600 uppercase tracking-wider">⏳ Pending</div>
          <div className="tabular text-xl font-bold text-yellow-700 dark:text-yellow-300">{summary.pending ?? '—'}</div>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2.5">
          <div className="text-[11px] text-red-500 uppercase tracking-wider">Active</div>
          <div className="tabular text-xl font-bold text-red-600">{summary.active ?? '—'}</div>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-2.5">
          <div className="text-[11px] text-green-500 uppercase tracking-wider">Resolved</div>
          <div className="tabular text-xl font-bold text-green-600">{summary.resolved ?? '—'}</div>
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-4 py-2.5">
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Total ({filters.days}d)</div>
          <div className="tabular text-xl font-bold text-zinc-700 dark:text-zinc-200">{summary.total ?? '—'}</div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-end">
        {[['status', STATUSES], ['type', TYPES], ['district', DISTRICTS]].map(([key, opts]) => (
          <div key={key}>
            <label className="label capitalize">{key}</label>
            <select value={filters[key]}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              className="input-field !w-auto text-xs">
              {opts.map((o) => <option key={o} value={o}>{o === 'all' ? `All ${key}s` : o}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="label">Days back</label>
          <select value={filters.days} onChange={(e) => setFilters((f) => ({ ...f, days: e.target.value }))}
            className="input-field !w-auto text-xs">
            {['7','14','30','60','90','365'].map((d) => <option key={d} value={d}>{d}d</option>)}
          </select>
        </div>
        <button onClick={load} className="btn-secondary !w-auto text-xs px-3">↻ Refresh</button>
        <button onClick={exportCSV} className="btn-secondary !w-auto text-xs px-3">⬇️ CSV</button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#01696f]/10 border border-[#01696f]/30">
          <span className="text-xs font-semibold text-[#01696f]">{selected.size} selected</span>
          {hasPending && (
            <>
              <button onClick={() => bulkAction('approve')} disabled={bulkBusy}
                className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">
                ✅ Approve all
              </button>
              <button onClick={() => bulkAction('reject')} disabled={bulkBusy}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 disabled:opacity-50">
                ❌ Reject all
              </button>
            </>
          )}
          <button onClick={() => bulkAction('resolve')} disabled={bulkBusy}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
            🗸 Resolve all
          </button>
          <button onClick={() => bulkAction('delete')} disabled={bulkBusy}
            className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
            🗑️ Delete all
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-zinc-400 hover:text-zinc-600">× Clear</button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`text-xs font-semibold ${ toast.isError ? 'text-red-500' : 'text-green-600' }`}>
          {toast.msg}
        </div>
      )}

      {/* Table */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="text-xs text-zinc-400 text-center py-10">
          No incidents found for the selected filters.
        </div>
      )}

      {!loading && incidents.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-zinc-400 uppercase tracking-wider">
                <th className="pb-2 pr-3 text-left w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    aria-label="Select all incidents"
                    className="rounded cursor-pointer" />
                </th>
                <th className="pb-2 pr-3 text-left">Type</th>
                <th className="pb-2 pr-3 text-left">Severity</th>
                <th className="pb-2 pr-3 text-left">District</th>
                <th className="pb-2 pr-3 text-left">Description</th>
                <th className="pb-2 pr-3 text-left">Status</th>
                <th className="pb-2 pr-3 text-left">Reported</th>
                <th className="pb-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {incidents.map((inc) => (
                <tr key={inc.id} className={`transition-colors ${
                  selected.has(inc.id) ? 'bg-[#01696f]/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                } ${
                  inc.status === 'pending' ? 'border-l-2 border-yellow-400' : ''
                }`}>
                  <td className="py-2.5 pr-3">
                    <input type="checkbox" checked={selected.has(inc.id)} onChange={() => toggleSelect(inc.id)}
                      aria-label={`Select incident ${inc.id}`}
                      className="rounded cursor-pointer" />
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true">{TYPE_ICON[inc.type] ?? '📌'}</span>
                      <span className="capitalize font-medium text-zinc-700 dark:text-zinc-200">{inc.type}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`capitalize font-semibold ${ SEVERITIES[inc.severity] ?? 'text-zinc-500' }`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-500 whitespace-nowrap">{inc.district}</td>
                  <td className="py-2.5 pr-3 max-w-[200px]">
                    <div className="truncate text-zinc-600 dark:text-zinc-300">{inc.description}</div>
                    {inc.address && <div className="text-zinc-400 truncate">{inc.address}</div>}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${ STATUS_BADGE[inc.status] ?? 'bg-zinc-100 text-zinc-500' }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-400 whitespace-nowrap">
                    {inc.reported_at
                      ? new Date(inc.reported_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      {inc.status === 'pending' && (
                        <>
                          <button onClick={() => singleAction(inc.id, 'approve')}
                            title="Approve"
                            className="text-green-600 hover:text-green-700 font-bold">✓</button>
                          <button onClick={() => singleAction(inc.id, 'reject')}
                            title="Reject"
                            className="text-zinc-400 hover:text-zinc-600 font-bold">×</button>
                        </>
                      )}
                      {inc.status === 'active' && (
                        <button onClick={() => singleAction(inc.id, 'resolve')}
                          title="Mark resolved"
                          className="text-blue-500 hover:text-blue-700 font-semibold">✔</button>
                      )}
                      <button onClick={() => singleAction(inc.id, 'delete')}
                        title="Delete"
                        className="text-red-400 hover:text-red-600">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
