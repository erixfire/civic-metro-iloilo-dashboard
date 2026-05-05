/**
 * ForecastMini — compact 5-day forecast for the main dashboard
 * Horizontal scrollable strip: icon, day, high/low, rain %
 */
import { useForecast } from '../hooks/useForecast'

export default function ForecastMini() {
  const { data, loading } = useForecast()

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          📅 5-Day Forecast
        </h2>
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
      </div>

      {loading && (
        <div className="flex gap-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 w-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0" />
          ))}
        </div>
      )}

      {!loading && data?.days && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {data.days.map((day) => (
            <div
              key={day.date}
              className="shrink-0 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-3 py-2 text-center min-w-[68px]"
            >
              <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                {new Date(day.date + 'T12:00:00+08:00').toLocaleDateString('en-PH', { weekday: 'short' })}
              </div>
              <div className="text-2xl my-1">{day.icon}</div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                {day.tempMax}°
                <span className="font-normal text-zinc-400 ml-0.5">{day.tempMin}°</span>
              </div>
              <div className={`text-[9px] mt-1 font-semibold ${
                day.rainPct >= 70 ? 'text-blue-500' :
                day.rainPct >= 40 ? 'text-yellow-500' : 'text-zinc-400'
              }`}>🌧️ {day.rainPct}%</div>
            </div>
          ))}
        </div>
      )}

      {!loading && !data && (
        <div className="text-xs text-zinc-400 text-center py-4">Forecast unavailable.</div>
      )}
    </div>
  )
}
