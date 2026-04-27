/**
 * AdminIncidents — Full incident management table for Admin Panel
 * Features: filter by type/district/status, select all, bulk resolve/delete, CSV export, stats bar
 */
import { useState, useEffect, useCallback } from 'react'

const TYPES      = ['all','flood','fire','landslide','accident','medical','crime','infrastructure','other']
const DISTRICTS  = ['all','City Proper','Arevalo','Jaro','La Paz','Lapuz','Mandurriao','Molo','Rizal']
const STATUSES   = ['all','active','resolved']
const SEVERITIES = { critical: 'text-red-600', high: 'text-orange-500', moderate: 'text-yellow-500', low: 'text-green-600' }

const TYPE_ICON = {
  flood: '🌊', fire: '🔥', landslide: '⛰️', accident: '🚗',
  medical: '🏥', crime: '🚨', infrastructure: '🚧', other: '📌',
}

export default function AdminIncidents() {
  const [incidents, setIncidents] = useState([])
  const [summary,   setSummary]   = useState({})
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(new Set())
  const [bulkBusy,  setBulkBusy]  = useState(false)
  const [toast,     setToast]     = useState('')

  const [filters, setFilters] = useState({ status: 'all', type: 'all', district: 'all', days: '30' })

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const p = new URLSearchParams()
      if (filters.status   !== 'all') p.set('status',   filters.status)
      if (filters.type     !== 'all') p.set('type',     filters.type)
      if (filters.district !== 'all') p.set('district', filters.district)
      p.set('days', filters.days)

      const r = await fetch(`/api/incidents?${p}`)
      const d = await r.json()
      setIncidents(d.incidents ?? [])
      setSummary(d.summary ?? {})
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], action }),
      })
      const d = await r.json()
      showToast(`✅ ${action === 'resolve' ? 'Resolved' : 'Deleted'} ${d.affected} incident(s)`)
      load()
    } finally { setBulkBusy(false) }
  }

  async function singleAction(id, action) {
    await fetch('/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    load()
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

  return (
    <div className="space-y-4">

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
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
          <button onClick={() => bulkAction('resolve')} disabled={bulkBusy}
            className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">
            ✅ Resolve all
          </button>
          <button onClick={() => bulkAction('delete')} disabled={bulkBusy}
            className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
            🗑️ Delete all
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-zinc-400 hover:text-zinc-600">× Clear</button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="text-xs text-green-600 font-semibold">{toast}</div>}

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
                }`}>
                  <td className="py-2.5 pr-3">
                    <input type="checkbox" checked={selected.has(inc.id)} onChange={() => toggleSelect(inc.id)}
                      className="rounded cursor-pointer" />
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span>{TYPE_ICON[inc.type] ?? '📌'}</span>
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
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      inc.status === 'active'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>{inc.status}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-400 whitespace-nowrap">
                    {inc.reported_at
                      ? new Date(inc.reported_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      {inc.status === 'active' && (
                        <button onClick={() => singleAction(inc.id, 'resolve')}
                          className="text-green-600 hover:text-green-700 font-semibold">✔</button>
                      )}
                      <button onClick={() => singleAction(inc.id, 'delete')}
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
