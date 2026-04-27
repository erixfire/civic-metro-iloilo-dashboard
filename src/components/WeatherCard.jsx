import { useWeather } from '../hooks/useWeather'
import { WEATHER, TIDE } from '../data/mockData'

const UV_LABEL = (v) => {
  if (v <= 2)  return { label: 'Low',       cls: 'text-green-500' }
  if (v <= 5)  return { label: 'Moderate',  cls: 'text-yellow-500' }
  if (v <= 7)  return { label: 'High',      cls: 'text-orange-500' }
  if (v <= 10) return { label: 'Very High', cls: 'text-red-500' }
  return               { label: 'Extreme',  cls: 'text-purple-600' }
}

function WeatherIcon({ code = 1 }) {
  const map = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 61: '🌧️', 80: '🌦️', 95: '⛈️' }
  const keys = [0, 1, 2, 3, 45, 61, 80, 95]
  const closest = keys.reduce((a, b) => (Math.abs(b - code) < Math.abs(a - code) ? b : a))
  return <span className="text-4xl">{map[closest] ?? '🌤️'}</span>
}

function Stat({ label, value, extra }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
      <div className="text-xs text-zinc-400 mb-0.5">{label}</div>
      <div className="tabular font-medium text-zinc-700 dark:text-zinc-200 text-sm">
        {value}{extra}
      </div>
    </div>
  )
}

export default function WeatherCard() {
  const { weather, loading, error } = useWeather()
  const w = weather ?? WEATHER   // live data first, mock fallback

  const uv = UV_LABEL(w.uvIndex ?? w.uvIndex ?? 0)
  const hiLabel = weather?.heatIndexLabel ?? w.heatIndexLabel ?? 'N/A'
  const hiCls   = weather?.heatIndexCls   ?? w.heatIndexColor  ?? 'text-zinc-400'
  const hiVal   = weather?.heatIndex      ?? w.heatIndex       ?? ''

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Weather — Iloilo City
        </h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-400 animate-pulse">Updating…</span>}
          {error   && <span className="text-[11px] text-red-400" title={error}>⚠ fallback</span>}
          {weather  && <span className="text-[11px] text-zinc-400">Open-Meteo · live</span>}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <WeatherIcon code={w.weatherCode} />
        <div>
          <div className="tabular text-4xl font-bold text-zinc-800 dark:text-zinc-100">
            {w.temp}°C
          </div>
          <div className="text-sm text-zinc-500">{w.condition}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-zinc-400">Feels like</div>
          <div className="tabular text-xl font-semibold text-zinc-700 dark:text-zinc-200">
            {w.feelsLike}°C
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <Stat label="Humidity"   value={`${w.humidity}%`} />
        <Stat label="Wind"       value={`${w.windSpeed} km/h ${w.windDir}`} />
        <Stat
          label="UV Index"
          value={`${w.uvIndex ?? '–'} — `}
          extra={<span className={uv.cls}>{uv.label}</span>}
        />
        <Stat
          label="Heat Index"
          value={hiVal ? `${hiVal}°C — ` : ''}
          extra={<span className={hiCls}>{hiLabel}</span>}
        />
      </div>

      <div className="border-t border-black/10 dark:border-white/10 pt-3">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          🌊 Iloilo River Tide
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="tabular text-2xl font-bold text-brand-600 dark:text-brand-400">
              {TIDE.currentLevel}{' '}
              <span className="text-base font-normal">m</span>
            </div>
            <div className={`text-xs font-medium ${TIDE.statusColor}`}>{TIDE.status}</div>
          </div>
          <div className="text-right text-xs text-zinc-500 space-y-1">
            <div>⬆ High: {TIDE.highTide.level}m at {TIDE.highTide.time}</div>
            <div>⬇ Low:  {TIDE.lowTide.level}m at  {TIDE.lowTide.time}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
