/**
 * AdminAuditLog — Last 30 admin actions from D1 audit_log
 */
import { useState, useEffect } from 'react'

const ACTION_ICON = {
  fuel_price_saved:      '⛽',
  heat_index_saved:      '🌡️',
  utility_alert_added:   '⚡',
  utility_alert_updated: '⚡',
  setting_updated:       '⚙️',
  cmc_meeting_created:   '🏛️',
  incident_created:      '📌',
}

export default function AdminAuditLog() {
  const [log,     setLog]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/audit-log?limit=30')
      const d = await r.json()
      setLog(d.log ?? [])
    } finally { setLoading(false) }
  }

  if (loading) return <div className="text-xs text-zinc-400 animate-pulse">Loading audit log…</div>
  if (!log.length) return <div className="text-xs text-zinc-400">No audit entries yet.</div>

  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto">
      {log.map((entry) => (
        <div key={entry.id}
          className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-xs">
          <span className="text-base shrink-0">{ACTION_ICON[entry.action] ?? '📝'}</span>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200 font-mono">{entry.action}</span>
            {entry.table_name && <span className="text-zinc-400"> → {entry.table_name}</span>}
            {entry.record_id  && <span className="text-zinc-400"> #{entry.record_id}</span>}
            {entry.details && (
              <div className="text-zinc-400 truncate mt-0.5">{entry.details}</div>
            )}
          </div>
          <span className="text-zinc-400 shrink-0 tabular">
            {new Date(entry.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  )
}
