import useIncidentStore from '../store/useIncidentStore'

const TYPE_ICON = {
  flood:     '💧',
  fire:      '🔥',
  traffic:   '🚦',
  medical:   '🚑',
  power:     '⚡',
  landslide: '⛰️',
  crime:     '🚨',
  other:     'ℹ️',
}

const SEV_CLS = {
  high:     'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200',
  moderate: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-200',
  low:      'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200',
}

function fmt(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch { return '' }
}

export default function IncidentList() {
  const { incidents, resolveIncident, deleteIncident } = useIncidentStore()
  const active   = incidents.filter((i) => i.status === 'active')
  const resolved = incidents.filter((i) => i.status === 'resolved').slice(0, 5)

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          📋 Incident Log
        </h2>
        <div className="text-sm text-zinc-400 text-center py-8">No incidents reported.</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
        📊 Incident Log
        {active.length > 0 && (
          <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
            {active.length} active
          </span>
        )}
      </h2>

      {active.length > 0 && (
        <div className="space-y-2 mb-4">
          {active.map((inc) => (
            <div
              key={inc.id}
              className={`rounded-lg border px-3 py-2 flex items-start justify-between gap-2 ${
                SEV_CLS[inc.severity] ?? SEV_CLS.moderate
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span>{TYPE_ICON[inc.type] ?? 'ℹ️'}</span>
                  <span className="text-sm font-medium capitalize">{inc.type}</span>
                  <span className="text-xs opacity-70">· {inc.district}</span>
                </div>
                <div className="text-xs opacity-80 line-clamp-2">{inc.description}</div>
                {inc.address && <div className="text-xs opacity-60 mt-0.5">{inc.address}</div>}
                <div className="text-[10px] opacity-50 mt-0.5">
                  Reported {fmt(inc.reportedAt)}{inc.reporter ? ` by ${inc.reporter}` : ''}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => resolveIncident(inc.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/50 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 border border-current/20 transition-colors"
                >
                  Resolve
                </button>
                <button
                  onClick={() => deleteIncident(inc.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/50 dark:bg-zinc-800/80 hover:bg-red-50 dark:hover:bg-red-950/50 border border-current/20 text-red-600 dark:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Recently Resolved</div>
          <div className="space-y-1">
            {resolved.map((inc) => (
              <div key={inc.id} className="flex items-center gap-2 text-xs text-zinc-400 rounded px-2 py-1 bg-zinc-50 dark:bg-zinc-800/50">
                <span>{TYPE_ICON[inc.type] ?? 'ℹ️'}</span>
                <span className="capitalize">{inc.type}</span>
                <span>·</span>
                <span>{inc.district}</span>
                <span className="ml-auto">✓ {fmt(inc.resolvedAt)}</span>
                <button onClick={() => deleteIncident(inc.id)} className="text-zinc-300 hover:text-red-400 transition-colors">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
