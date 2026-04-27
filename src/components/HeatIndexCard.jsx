import { useHeatIndex }    from '../hooks/useHeatIndex'
import { useHeatIndexNews } from '../hooks/useHeatIndexNews'

const LEVEL_BADGE = {
  'Extreme Danger':  'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-400 dark:border-red-700',
  'Danger':          'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  'Extreme Caution': 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  'Caution':         'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  'Normal':          'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
}

const PAGASA_SCALE = [
  { range: '27–32°C', label: 'Caution',         color: 'bg-yellow-400' },
  { range: '33–41°C', label: 'Extreme Caution', color: 'bg-orange-400' },
  { range: '42–51°C', label: 'Danger',          color: 'bg-red-500'   },
  { range: '52°C+',   label: 'Extreme Danger',  color: 'bg-red-800'   },
]

export default function HeatIndexCard() {
  const { readings, loading, fromD1, lastFetched, refetch } = useHeatIndex()
  const { news }                                            = useHeatIndexNews()

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            🌡️ Heat Index — Iloilo
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${ fromD1 ? 'bg-green-500' : 'bg-zinc-400' }`} />
            <span className="text-[10px] text-zinc-400">
              {fromD1 ? 'Live · D1' : 'PAGASA mock'}
              {lastFetched && ` · ${new Date(lastFetched).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            <button onClick={refetch} className="text-[10px] text-zinc-400 hover:text-[#01696f]">↻</button>
          </div>
        </div>
        <span className="text-[11px] text-zinc-400">
          Source: {fromD1 ? 'D1 / Admin Entry' : 'PAGASA'}
        </span>
      </div>

      {/* Readings skeleton */}
      {loading && (
        <div className="space-y-2 mb-5">
          {[1,2,3].map((i) => <div key={i} className="h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      )}

      {/* Area readings */}
      {!loading && (
        <div className="space-y-2 mb-5">
          {readings.map((a) => (
            <div key={a.area}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${ LEVEL_BADGE[a.level] ?? 'bg-zinc-50 dark:bg-zinc-800 border-black/10 dark:border-white/10' }`}>
              <div className="tabular text-2xl font-bold min-w-[3.5rem]">{a.hiC}°C</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-tight">{a.area}</div>
                <div className="text-xs opacity-80 mt-0.5">
                  <span className="font-medium">{a.level}</span> — {a.note}
                </div>
              </div>
              {a.log_date && (
                <span className="text-[10px] text-zinc-400 shrink-0 mt-0.5">{a.log_date}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PAGASA scale legend */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">PAGASA Heat Index Scale</div>
        <div className="flex gap-1.5 flex-wrap">
          {PAGASA_SCALE.map((s) => (
            <div key={s.label} className="flex items-center gap-1 text-xs">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.color}`} />
              <span className="text-zinc-600 dark:text-zinc-300">{s.label} <span className="opacity-60">({s.range})</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* News feed */}
      <div>
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">📰 Latest Heat Index News</div>
        <div className="space-y-2 overflow-y-auto max-h-[260px] pr-0.5">
          {(news ?? []).map((n) => (
            <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
              className="block rounded-lg border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200 leading-tight">{n.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.summary}</div>
                </div>
                {n.level && (
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${ LEVEL_BADGE[n.level] ?? '' }`}>
                    {n.level}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
                <span>{n.source}</span><span>·</span><span>{n.date}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
