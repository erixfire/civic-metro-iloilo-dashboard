/**
 * WeatherHistoryChart — historical temp + AQI chart from D1 weather_log
 * Renders a dual-axis SVG sparkline chart (no external chart lib needed)
 */
import { useState } from 'react'
import { useWeatherHistory } from '../hooks/useWeatherHistory'

const RANGE_OPTIONS = [
  { label: '24h', days: 1 },
  { label: '7d',  days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
]

const AQI_COLOR = (aqi) => {
  if (!aqi)      return '#a1a1aa'
  if (aqi <= 50) return '#22c55e'
  if (aqi <= 100) return '#86efac'
  if (aqi <= 150) return '#facc15'
  if (aqi <= 200) return '#f97316'
  return '#ef4444'
}

function Sparkline({ points, color, width = 600, height = 80, fill = false }) {
  if (!points || points.length < 2) return null
  const vals = points.map((p) => p.y)
  const min  = Math.min(...vals)
  const max  = Math.max(...vals)
  const range = max - min || 1
  const xs = points.map((_, i) => (i / (points.length - 1)) * width)
  const ys = points.map((p) => height - ((p.y - min) / range) * (height - 8) - 4)
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const fillPath = fill ? `${d} L${width},${height} L0,${height} Z` : null

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {fill && <path d={fillPath} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill={color} />
    </svg>
  )
}

export default function WeatherHistoryChart() {
  const [days, setDays] = useState(7)
  const [tab,  setTab]  = useState('temp') // 'temp' | 'aqi' | 'humidity'
  const { data, loading, error } = useWeatherHistory(days)

  const rows = data?.rows ?? []

  const tempPoints = rows.map((r, i) => ({ x: i, y: r.avg_temp ?? 0 }))
  const aqiPoints  = rows.map((r, i) => ({ x: i, y: r.avg_aqi  ?? 0 }))
  const humPoints  = rows.map((r, i) => ({ x: i, y: r.avg_humidity ?? 0 }))
  const hiPoints   = rows.map((r, i) => ({ x: i, y: r.avg_heat_index ?? 0 }))

  const latestAqi  = rows[rows.length - 1]?.avg_aqi
  const latestTemp = rows[rows.length - 1]?.avg_temp

  const TABS = [
    { key: 'temp',     label: '🌡️ Temp',     color: '#f97316', points: tempPoints, unit: '°C' },
    { key: 'aqi',      label: '💨 AQI',      color: AQI_COLOR(latestAqi), points: aqiPoints, unit: 'AQI' },
    { key: 'humidity', label: '💧 Humidity', color: '#38bdf8', points: humPoints, unit: '%' },
    { key: 'heatidx',  label: '🥵 Heat Idx', color: '#ef4444', points: hiPoints, unit: '°C' },
  ]

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0]
  const latestVal = activeTab.points[activeTab.points.length - 1]?.y

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          📈 Weather & AQI History
        </h2>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((o) => (
            <button key={o.days} onClick={() => setDays(o.days)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
                days === o.days
                  ? 'bg-[#01696f] text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-colors border ${
              tab === t.key
                ? 'border-transparent text-white'
                : 'border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800 text-zinc-500'
            }`}
            style={tab === t.key ? { backgroundColor: t.color } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      {loading && (
        <div className="h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse mb-3" />
      )}

      {!loading && rows.length === 0 && (
        <div className="h-24 flex items-center justify-center text-xs text-zinc-400">
          No historical data yet — the cron job collects data hourly.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="mb-1">
            <Sparkline
              points={activeTab.points}
              color={activeTab.color}
              height={88}
              fill
            />
          </div>
          {/* X-axis labels: first and last */}
          <div className="flex justify-between text-[9px] text-zinc-400 mb-3">
            <span>{rows[0]?.hour ? new Date(rows[0].hour + 'Z').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}</span>
            <span className="font-semibold" style={{ color: activeTab.color }}>
              Now: {latestVal != null ? `${latestVal}${activeTab.unit}` : '—'}
            </span>
            <span>{rows[rows.length-1]?.hour ? new Date(rows[rows.length-1].hour + 'Z').toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Min', val: Math.min(...activeTab.points.map(p => p.y)).toFixed(1) },
              { label: 'Avg', val: (activeTab.points.reduce((s,p) => s + p.y, 0) / activeTab.points.length).toFixed(1) },
              { label: 'Max', val: Math.max(...activeTab.points.map(p => p.y)).toFixed(1) },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-2 py-1.5 text-center">
                <div className="text-[9px] text-zinc-400 uppercase tracking-wider">{label}</div>
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200 tabular">{val}{activeTab.unit}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-[10px] text-zinc-400 flex justify-between">
        <span>Data from D1 · logged hourly by cron</span>
        {error && <span className="text-red-400">Error: {error}</span>}
      </div>
    </div>
  )
}
