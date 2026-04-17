import { useWeather } from '../hooks/useWeather'
import { WEATHER, TIDE } from '../data/mockData'

const UV_LABEL = (v) => {
  if (v <= 2) return { label: 'Low', cls: 'text-green-500' }
  if (v <= 5) return { label: 'Moderate', cls: 'text-yellow-500' }
  if (v <= 7) return { label: 'High', cls: 'text-orange-500' }
  if (v <= 10) return { label: 'Very High', cls: 'text-red-500' }
  return { label: 'Extreme', cls: 'text-purple-600' }
}

const HEAT_INDEX = (temp, rh) => {
  if (temp < 27) return { label: 'Normal', cls: 'text-green-500' }
  const hi = -8.784695 + 1.61139411*temp + 2.338549*rh - 0.14611605*temp*rh
    - 0.012308094*(temp**2) - 0.016424828*(rh**2)
    + 0.002211732*(temp**2)*rh + 0.00072546*(temp)*(rh**2)
    - 0.000003582*(temp**2)*(rh**2)
  if (hi < 27) return { label: 'Normal', cls: 'text-green-500' }
  if (hi < 32) return { label: 'Caution', cls: 'text-yellow-500' }
  if (hi < 41) return { label: 'Extreme Caution', cls: 'text-orange-500' }
  if (hi < 54) return { label: 'Danger', cls: 'text-red-500' }
  return { label: 'Extreme Danger', cls: 'text-red-700 font-bold' }
}

function WeatherIcon({ code = 1 }) {
  const icons = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 61: '🌧️', 80: '🌦️', 95: '⛈️' }
  const closest = [0,1,2,3,45,61,80,95].reduce((a, b) =>
    Math.abs(b - code) < Math.abs(a - code) ? b : a)
  return <span className="text-4xl">{icons[closest] || '🌤️'}</span>
}

export default function WeatherCard() {
  const { weather, loading } = useWeather()
  const w = weather || WEATHER
  const uv = UV_LABEL(w.uvIndex)
  const hi = HEAT_INDEX(w.temp, w.humidity)

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Weather — Iloilo City
        </h2>
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Updating…</span>}
      </div>
      <div className="flex items-center gap-4 mb-4">
        <WeatherIcon code={w.weatherCode} />
        <div>
          <div className="tabular text-4xl font-bold text-zinc-800 dark:text-zinc-100">{w.temp}°C</div>
          <div className="text-sm text-zinc-5