import { useRainGauge } from '../hooks/useRainGauge'
import { useLang }      from '../hooks/useLang'

const LEVEL_BADGE = {
  Critical: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  Alarming: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Normal:   'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
}

const LEVEL_ICON  = { Critical: '🔴', Alarming: '🟡', Normal: '🟢' }
const LEVEL_TRANS = {
  Critical: { en: 'Critical', hil: 'Kritikal' },
  Alarming: { en: 'Alarming', hil: 'Alarmante' },
  Normal:   { en: 'Normal',   hil: 'Normal' },
}

export default function RainGaugeCard() {
  const { data, loading, error } = useRainGauge()
  const { t } = useLang()
  const gauges        = data?.gauges ?? []
  const isFallback    = data?.isFallback
  const criticalCount = gauges.filter((g) => g.level === 'Critical').length
  const alarmingCount = gauges.filter((g) => g.level === 'Alarming').length

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          🌧️ {t('Rain / Flood Gauge', 'Sukod sang Ulan / Baha')}
        </h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-400 animate-pulse" aria-live="polite">{t('Loading…', 'Nagkarga…')}</span>}
          {error   && <span className="text-[11px] text-red-400" role="status">⚠ fallback</span>}
          {!loading && !error && isFallback  && <span className="text-[11px] text-amber-500">⚠ {t('mock data', 'huwad nga datos')}</span>}
          {!loading && !error && !isFallback && <span className="text-[11px] text-zinc-400">Open-Meteo · 5 min</span>}
        </div>
      </div>

      {/* Alert strip */}
      {(criticalCount > 0 || alarmingCount > 0) && (
        <div className={`rounded-lg px-3 py-2 mb-3 text-xs font-medium flex items-center gap-2 ${
          criticalCount > 0
            ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            : 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
        }`}>
          <span>{criticalCount > 0 ? '🔴' : '🟡'}</span>
          {criticalCount > 0 && (
            <span>
              {criticalCount} {t(
                `station${criticalCount > 1 ? 's' : ''} at Critical level`,
                `estasyon sa antas nga Kritikal`,
              )}
            </span>
          )}
          {alarmingCount > 0 && criticalCount === 0 && (
            <span>
              {alarmingCount} {t(
                `station${alarmingCount > 1 ? 's' : ''} at Alarming level`,
                `estasyon sa antas nga Alarmante`,
              )}
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 mb-3 text-[10px] text-zinc-400">
        <span>🟢 {t('Normal', 'Normal')} &lt;10mm/hr</span>
        <span>🟡 {t('Alarming', 'Alarmante')} 10–30</span>
        <span>🔴 {t('Critical', 'Kritikal')} &gt;30</span>
      </div>

      <div className="space-y-2">
        {gauges.length === 0 && !loading && (
          <div className="text-sm text-zinc-400 text-center py-4">
            {t('No gauge data available.', 'Wala sang datos sang sukod.')}
          </div>
        )}
        {gauges.map((g) => {
          const lv = LEVEL_TRANS[g.level] ?? LEVEL_TRANS.Normal
          return (
            <div
              key={g.id}
              className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-3 ${
                LEVEL_BADGE[g.level] ?? LEVEL_BADGE.Normal
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0" aria-hidden="true">{LEVEL_ICON[g.level] ?? '🟢'}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{g.name}</div>
                  <div className="text-[10px] opacity-70">
                    {t(lv.en, lv.hil)} · {g.source}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="tabular text-sm font-semibold">
                  {g.rainfall1h != null ? `${g.rainfall1h} mm/hr` : '—'}
                </div>
                {g.rainfall24h != null && (
                  <div className="text-[10px] opacity-60">{g.rainfall24h} mm / 24h</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
