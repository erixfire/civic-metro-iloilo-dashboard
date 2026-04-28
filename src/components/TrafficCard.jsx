import { useWazeTraffic } from '../hooks/useWazeTraffic'
import { JEEPNEY_REROUTES } from '../data/mockData'

const JAM_BG = [
  'bg-green-500',
  'bg-green-300',
  'bg-yellow-400',
  'bg-orange-500',
  'bg-red-500',
  'bg-red-900',
]

const JAM_TEXT = [
  'text-green-700 dark:text-green-300',
  'text-green-600 dark:text-green-400',
  'text-yellow-700 dark:text-yellow-300',
  'text-orange-600 dark:text-orange-300',
  'text-red-600 dark:text-red-300',
  'text-red-900 dark:text-red-200',
]

const JAM_BADGE_BG = [
  'bg-green-100 dark:bg-green-900/40',
  'bg-green-100 dark:bg-green-900/30',
  'bg-yellow-100 dark:bg-yellow-900/40',
  'bg-orange-100 dark:bg-orange-900/40',
  'bg-red-100 dark:bg-red-900/40',
  'bg-red-200 dark:bg-red-900/60',
]

export default function TrafficCard() {
  const { data, loading, error, refetch } = useWazeTraffic()

  const dl = data.dominantLevel ?? 0
  const updatedAt = data.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    : null

  // Max jam length for bar scaling
  const maxM = Math.max(...(data.jamBreakdown.map(j => j.meters)), 1)

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          🚦 Traffic & Transport
        </h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
          {error && !loading && (
            <span className="text-[11px] text-amber-500">⚠ offline</span>
          )}
          {!loading && !error && (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Waze Live
            </span>
          )}
          <button
            onClick={refetch}
            title="Refresh"
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Dominant status banner */}
      <div className={`rounded-lg px-4 py-3 mb-4 flex items-center justify-between ${JAM_BADGE_BG[dl]}`}>
        <div>
          <div className={`text-lg font-extrabold ${JAM_TEXT[dl]}`}>
            {data.dominantLabel}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {data.totalJamKm} km congested &middot; {data.totalWazers} drivers reporting
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${JAM_BG[dl]}`} />
      </div>

      {/* Jam level breakdown bars */}
      {data.jamBreakdown.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Congestion by Severity
          </div>
          <div className="space-y-2">
            {data.jamBreakdown
              .filter(j => j.level >= 1)
              .sort((a, b) => a.level - b.level)
              .map(j => (
                <div key={j.level}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className={`font-medium ${JAM_TEXT[j.level]}`}>{j.label}</span>
                    <span className="text-zinc-400">{j.km} km</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${JAM_BG[j.level]}`}
                      style={{ width: `${Math.round((j.meters / maxM) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Jeepney Reroutes (still manual/admin) */}
      <div>
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          🚌 Jeepney Reroutes
        </div>
        <div className="space-y-2">
          {JEEPNEY_REROUTES.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2"
            >
              <span
                className={`mt-0.5 shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold text-white ${
                  r.status === 'Rerouted'
                    ? 'bg-orange-500'
                    : r.status === 'Suspended'
                    ? 'bg-red-500'
                    : 'bg-green-500'
                }`}
              >
                {r.status}
              </span>
              <div>
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{r.route}</div>
                <div className="text-xs text-zinc-400">{r.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 text-[11px] text-zinc-400 flex justify-between">
        <span>Auto-refreshes every 2 min</span>
        {updatedAt && <span>Last update: {updatedAt}</span>}
      </div>
    </div>
  )
}
