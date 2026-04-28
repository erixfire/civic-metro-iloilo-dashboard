import { useHeatIndex }     from '../hooks/useHeatIndex'
import { useHeatIndexNews } from '../hooks/useHeatIndexNews'

const LEVEL_CONFIG = {
  'Extreme Danger':  { cls: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-400',    icon: '🚨', hil: 'Grabe nga Delikado — Indi gid lumabas!' },
  'Danger':          { cls: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300',      icon: '🔴', hil: 'Delikado — Magpabilin sa sulod.' },
  'Extreme Caution': { cls: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 border-orange-300',           icon: '🟠', hil: 'Mag-halong gid! Mag-inom sang tubig.' },
  'Caution':         { cls: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 border-yellow-300',           icon: '🟡', hil: 'Mag-inot. Indi magpainit kung dili kinahanglan.' },
  'Normal':          { cls: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300', icon: '🟢', hil: 'Luwas ang kainit karon.' },
}

const PAGASA_SCALE = [
  { range: '27–32°C', en: 'Caution',         hil: 'Mag-inot',        color: 'bg-yellow-400' },
  { range: '33–41°C', en: 'Extreme Caution', hil: 'Mag-halong Gid',  color: 'bg-orange-400' },
  { range: '42–51°C', en: 'Danger',          hil: 'Delikado',        color: 'bg-red-500'   },
  { range: '52°C+',   en: 'Extreme Danger',  hil: 'Grabe Delikado',  color: 'bg-red-800'   },
]

export default function HeatIndexCard() {
  const { readings, loading, fromD1, lastFetched, refetch } = useHeatIndex()
  const { news } = useHeatIndexNews()

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">🌡️ Heat Index</h2>
          <p className="text-xs text-zinc-400">Kainit sang Hangin — Iloilo</p>
        </div>
        <button onClick={refetch} title="I-refresh" className="text-zinc-400 hover:text-[#01696f] text-sm transition-colors">↻</button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2 mb-4">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      )}

      {/* Area readings */}
      {!loading && (
        <div className="space-y-2 mb-4">
          {readings.map((a) => {
            const cfg = LEVEL_CONFIG[a.level] ?? LEVEL_CONFIG['Normal']
            return (
              <div key={a.area} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${cfg.cls}`}>
                <span className="text-2xl mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-bold">{a.area}</span>
                    <span className="tabular text-2xl font-extrabold">{a.hiC}°C</span>
                  </div>
                  <div className="text-xs mt-0.5 opacity-90 font-medium">{a.level} — {cfg.hil}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PAGASA Scale legend */}
      <div className="mb-4">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">PAGASA Scale · Sukat sang Kainit</div>
        <div className="grid grid-cols-2 gap-1.5">
          {PAGASA_SCALE.map((s) => (
            <div key={s.en} className="flex items-center gap-2 text-xs">
              <span className={`inline-block w-3 h-3 rounded-sm shrink-0 ${s.color}`} />
              <div>
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">{s.en}</span>
                <span className="text-zinc-400"> · {s.hil}</span>
                <span className="text-zinc-400 ml-1">({s.range})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source line */}
      <div className="text-[10px] text-zinc-400 mb-3">
        {fromD1 ? `Live · D1 / Admin Entry` : 'PAGASA reference data'}
        {lastFetched ? ` · Naultime sang ${new Date(lastFetched).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </div>

      {/* News */}
      {(news ?? []).length > 0 && (
        <div>
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">📰 Latest News · Bag-ong Balita</div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
            {news.map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                className="block rounded-lg border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200 leading-tight line-clamp-2">{n.title}</div>
                <div className="text-[10px] text-zinc-400 mt-1">{n.source} · {n.date}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
