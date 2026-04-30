import { useWeather } from '../hooks/useWeather'
import { useTide }    from '../hooks/useTide'
import { useLang }    from '../hooks/useLang'
import { WEATHER }    from '../data/mockData'

const UV_INFO = (v) => {
  if (v <= 2)  return { en: 'Low',       hil: 'Baba',         cls: 'text-green-500',  bar: 'bg-green-400' }
  if (v <= 5)  return { en: 'Moderate',  hil: 'Kalatngan',    cls: 'text-yellow-500', bar: 'bg-yellow-400' }
  if (v <= 7)  return { en: 'High',      hil: 'Taas',         cls: 'text-orange-500', bar: 'bg-orange-400' }
  if (v <= 10) return { en: 'Very High', hil: 'Labi ka Taas', cls: 'text-red-500',    bar: 'bg-red-400' }
  return               { en: 'Extreme',  hil: 'Peligroso',    cls: 'text-purple-600', bar: 'bg-purple-500' }
}

const HI_ADVICE = {
  'Normal':          { en: 'Safe heat conditions.',                     hil: 'Luwas ang kainit.',                  icon: '🟢' },
  'Caution':         { en: 'Take care. Drink water.',                   hil: 'Mag-inot. Mag-inom sang tubig.',     icon: '🟡' },
  'Extreme Caution': { en: 'Be careful! Avoid prolonged heat.',        hil: 'Mag-halong gid! Indi magpainit.',   icon: '🟠' },
  'Danger':          { en: 'Dangerous! Stay indoors.',                  hil: 'Delikado! Magpabilin sa sulod.',     icon: '🔴' },
  'Extreme Danger':  { en: 'Extreme danger! Do not go outside.',       hil: 'Grabe nga delikado! Indi lumabas.', icon: '🚨' },
}

const STATS = [
  { key: 'humidity',   en: 'Humidity',    hil: 'Kahamog',              fmt: (w) => `${w.humidity}%` },
  { key: 'wind',       en: 'Wind',        hil: 'Hangin',               fmt: (w) => `${w.windSpeed} km/h ${w.windDir ?? ''}` },
  { key: 'uv',         en: 'UV Index',    hil: 'Sikat sang Adlaw',     fmt: null },
  { key: 'rain',       en: 'Rain Chance', hil: 'Posibilidad ng Ulan',  fmt: (w) => `${w.precipitation ?? w.rainChance ?? '–'}%` },
]

function WeatherIcon({ code = 1 }) {
  const map = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 61: '🌧️', 80: '🌦️', 95: '⛈️' }
  const keys = [0, 1, 2, 3, 45, 61, 80, 95]
  const closest = keys.reduce((a, b) => (Math.abs(b - code) < Math.abs(a - code) ? b : a))
  return <span className="text-5xl">{map[closest] ?? '🌤️'}</span>
}

export default function WeatherCard() {
  const { weather, loading, error } = useWeather()
  const { tide }   = useTide()
  const { t }      = useLang()
  const w          = weather ?? WEATHER
  const uv         = UV_INFO(w.uvIndex ?? 0)
  const hiLabel    = weather?.heatIndexLabel ?? w.heatIndexLabel ?? 'Normal'
  const hiVal      = weather?.heatIndex ?? w.heatIndex ?? null
  const advice     = HI_ADVICE[hiLabel] ?? HI_ADVICE['Normal']

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">
            🌤️ {t('Weather', 'Panahon')}
          </h2>
          <p className="text-xs text-zinc-400">{t('Weather — Iloilo City', 'Panahon — Iloilo City')}</p>
        </div>
        {loading && <span className="text-xs text-zinc-400 animate-pulse" aria-live="polite">{t('Loading…', 'Nagkarga…')}</span>}
        {error   && <span className="text-xs text-red-400">⚠ fallback</span>}
      </div>

      {/* Main temp */}
      <div className="flex items-center gap-4 mb-5">
        <WeatherIcon code={w.weatherCode} />
        <div className="flex-1">
          <div className="tabular text-5xl font-extrabold text-zinc-800 dark:text-zinc-100 leading-none">
            {w.temp}°<span className="text-2xl font-normal text-zinc-400 ml-1">C</span>
          </div>
          <div className="text-sm text-zinc-500 mt-1">{w.condition}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">{t('Feels like', 'Pakiramdam')}</div>
          <div className="tabular text-2xl font-bold text-zinc-700 dark:text-zinc-200">{w.feelsLike}°C</div>
        </div>
      </div>

      {/* Heat index advice banner */}
      <div className="rounded-lg px-3 py-2.5 mb-4 bg-zinc-50 dark:bg-zinc-800 flex items-start gap-2">
        <span className="text-xl">{advice.icon}</span>
        <div>
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {t('Heat Index', 'Kainit sang Hangin')}{hiVal ? `: ${hiVal}°C` : ''} — {hiLabel}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{t(advice.en, advice.hil)}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {STATS.map(({ key, en, hil, fmt }) => (
          <div key={key} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
            <div className="text-xs font-medium text-zinc-500">{t(en, hil)}</div>
            <div className="tabular text-sm font-semibold text-zinc-700 dark:text-zinc-200 mt-1">
              {key === 'uv'
                ? <>{w.uvIndex ?? '–'} — <span className={uv.cls}>{t(uv.en, uv.hil)}</span></>
                : fmt(w)}
            </div>
          </div>
        ))}
      </div>

      {/* Tide section */}
      {tide && (
        <div className="border-t border-black/10 dark:border-white/10 pt-3">
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mb-2">
            🌊 {t('River Tide', 'Tubig sang Suba')}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="tabular text-2xl font-bold text-[#01696f] dark:text-teal-400">
                {tide.currentLevel} <span className="text-base font-normal">m</span>
              </div>
              <div className={`text-xs font-semibold mt-0.5 ${tide.statusColor}`}>{tide.status}</div>
            </div>
            <div className="text-right text-xs text-zinc-500 space-y-1">
              <div>⬆ {t('High', 'Mataas')}: {tide.highTide?.level}m {t('at', 'sa')} {tide.highTide?.time}</div>
              <div>⬇ {t('Low', 'Mababa')}: {tide.lowTide?.level}m {t('at', 'sa')} {tide.lowTide?.time}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
