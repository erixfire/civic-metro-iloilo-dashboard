/**
 * ForecastStrip — full 5-day weather forecast for the weather page
 * Shows daily cards with min/max, rain %, icon, and an expandable 3-hour slot row
 */
import { useState } from 'react'
import { useForecast } from '../hooks/useForecast'

export default function ForecastStrip() {
  const { data, loading, error } = useForecast()
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          📅 5-Day Forecast
        </h2>
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
        {data && !loading && <span className="text-[11px] text-zinc-400">OpenWeatherMap · {data.city}</span>}
      </div>

      {error && !data && (
        <div className="text-xs text-red-400 py-4 text-center">Could not load forecast.</div>
      )}

      {loading && (
        <div className="grid grid-cols-5 gap-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {!loading && data?.days && (
        <>
          {/* Daily cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {data.days.map((day, i) => (
              <button
                key={day.date}
                onClick={() => setExpanded(expanded === i ? null : i)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  expanded === i
                    ? 'border-[#01696f] bg-teal-50 dark:bg-teal-900/20'
                    : 'border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1 truncate">{day.dayLabel}</div>
                <div className="text-3xl mb-2">{day.icon}</div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  {day.tempMax}° <span className="font-normal text-zinc-400">{day.tempMin}°</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px]">🌧️</span>
                  <span className={`text-[10px] font-semibold ${
                    day.rainPct >= 70 ? 'text-blue-500' :
                    day.rainPct >= 40 ? 'text-yellow-500' : 'text-zinc-400'
                  }`}>{day.rainPct}%</span>
                </div>
                <div className="text-[9px] text-zinc-400 mt-1 capitalize truncate">{day.condition}</div>
              </button>
            ))}
          </div>

          {/* Expanded 3-hour slots */}
          {expanded !== null && data.days[expanded] && (
            <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                {data.days[expanded].dayLabel} — 3-Hour Breakdown
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {data.days[expanded].slots.map((slot) => (
                  <div key={slot.time} className="shrink-0 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-3 py-2 text-center min-w-[64px]">
                    <div className="text-[10px] text-zinc-400 font-medium">{slot.time}</div>
                    <div className="text-xl my-1">{slot.icon}</div>
                    <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{slot.temp}°C</div>
                    <div className={`text-[9px] mt-0.5 font-semibold ${
                      slot.rainPct >= 70 ? 'text-blue-500' :
                      slot.rainPct >= 40 ? 'text-yellow-500' : 'text-zinc-400'
                    }`}>🌧️ {slot.rainPct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-[11px] text-zinc-400">
        Tap a day to expand 3-hour slots · Refreshes every 30 min
      </div>
    </div>
  )
}
