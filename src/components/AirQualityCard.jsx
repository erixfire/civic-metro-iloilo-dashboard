/**
 * AirQualityCard — displays real-time AQI for Iloilo City
 * Data: WAQI primary, OpenWeatherMap fallback via /api/air-quality
 */
import { useAirQuality } from '../hooks/useAirQuality'

const POLLUTANT_LABELS = {
  pm25: 'PM2.5', pm10: 'PM10', o3: 'O₃',
  no2:  'NO₂',   so2:  'SO₂',  co: 'CO',
}

const SCALE_BG = {
  1: 'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800',
  2: 'bg-lime-50   dark:bg-lime-900/20   border-lime-200   dark:border-lime-800',
  3: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  4: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  5: 'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800',
}

const SCALE_RING = {
  1: 'ring-green-400',
  2: 'ring-lime-400',
  3: 'ring-yellow-400',
  4: 'ring-orange-400',
  5: 'ring-red-500',
}

export default function AirQualityCard() {
  const { data, loading, error } = useAirQuality()

  const scale = data?.scale
  const cardBg   = SCALE_BG[scale]   ?? 'bg-zinc-50 dark:bg-zinc-800 border-black/10 dark:border-white/10'
  const ringColor = SCALE_RING[scale] ?? 'ring-zinc-300'

  return (
    <div className={`rounded-xl border p-5 shadow-sm h-full flex flex-col transition-colors ${cardBg}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          💨 Air Quality Index
        </h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
          {data?.isFallback && !loading && (
            <span className="text-[11px] text-amber-500">⚠ unavailable</span>
          )}
          {data && !data.isFallback && !loading && (
            <span className="text-[11px] text-zinc-400">{data.source}</span>
          )}
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="flex-1 space-y-3 animate-pulse">
          <div className="h-20 rounded-xl bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 rounded bg-zinc-200 dark:bg-zinc-700 w-3/4" />
          <div className="h-4 rounded bg-zinc-200 dark:bg-zinc-700 w-1/2" />
        </div>
      )}

      {/* Main AQI display */}
      {!loading && data && (
        <div className="flex-1 flex flex-col gap-4">

          {/* Big AQI ring */}
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full ring-4 ${ringColor} flex flex-col items-center justify-center shrink-0`}
              style={{ backgroundColor: data.color + '22' }}>
              <span className="text-2xl font-extrabold tabular" style={{ color: data.color }}>
                {data.aqi ?? '—'}
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">AQI</span>
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-800 dark:text-zinc-100" style={{ color: data.color }}>
                {data.label}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-snug max-w-[180px]">
                {data.advice}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1.5">{data.station}</div>
            </div>
          </div>

          {/* Pollutant breakdown */}
          {data.components && Object.keys(data.components).length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Pollutants (μg/m³)</div>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(POLLUTANT_LABELS).map(([key, label]) => {
                  const val = data.components[key]
                  if (val == null) return null
                  return (
                    <div key={key} className="rounded-lg bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 px-2 py-1.5 text-center">
                      <div className="text-[10px] text-zinc-400">{label}</div>
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular">
                        {typeof val === 'number' ? val.toFixed(1) : val}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-3 border-t border-black/5 dark:border-white/5 flex justify-between text-[10px] text-zinc-400">
            <span>Refreshes every 30 min</span>
            {data.updatedAt && (
              <span>
                Updated {new Date(data.updatedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && !data && (
        <div className="flex-1 flex items-center justify-center text-xs text-zinc-400">
          Could not load air quality data.
        </div>
      )}
    </div>
  )
}
