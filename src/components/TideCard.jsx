/**
 * TideCard — Iloilo Port tide card with 24-hour profile chart
 *            + recent Philippines earthquake feed (USGS GeoJSON)
 */
import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import { TIDE }    from '../data/mockData'
import { useLang } from '../hooks/useLang'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const REFRESH_MS  = 60 * 60 * 1000
const EQ_REFRESH  = 10 * 60 * 1000   // refresh earthquakes every 10 min

// USGS earthquake feed — M2.5+ within 1000 km of Philippines (16°N, 122°E)
const USGS_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
  '&orderby=time&limit=8&minmagnitude=2.5' +
  '&latitude=12&longitude=122&maxradiuskm=1200'

function buildHourlyProfile(events) {
  const hours = Array.from({ length: 25 }, (_, i) => i)
  return hours.map((h) => {
    let prev = events[events.length - 1]
    let next = events[0]
    for (let i = 0; i < events.length; i++) {
      if (events[i].hourDecimal <= h) prev = events[i]
      if (events[i].hourDecimal > h)  { next = events[i]; break }
    }
    const span    = next.hourDecimal > prev.hourDecimal ? next.hourDecimal - prev.hourDecimal : 24 - prev.hourDecimal + next.hourDecimal
    const elapsed = h >= prev.hourDecimal ? h - prev.hourDecimal : 24 - prev.hourDecimal + h
    const t       = span > 0 ? elapsed / span : 0
    const cos     = (1 - Math.cos(Math.PI * t)) / 2
    return parseFloat((prev.level + (next.level - prev.level) * cos).toFixed(2))
  })
}

function parseHour(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h + m / 60
}

function buildEventsFromTide(t) {
  return [
    t.lowTide2  ? { hourDecimal: parseHour(t.lowTide2.time),  level: t.lowTide2.level }  : null,
    t.highTide  ? { hourDecimal: parseHour(t.highTide.time),  level: t.highTide.level }  : null,
    t.lowTide   ? { hourDecimal: parseHour(t.lowTide.time),   level: t.lowTide.level }   : null,
    t.highTide2 ? { hourDecimal: parseHour(t.highTide2.time), level: t.highTide2.level } : null,
  ].filter(Boolean).sort((a, b) => a.hourDecimal - b.hourDecimal)
}

function nextEvent(tide, nowH) {
  const events = [
    { labelEn: '⬆️ High',  labelHil: '⬆️ Mataas', time: tide.highTide?.time,  level: tide.highTide?.level  },
    { labelEn: '⬇️ Low',   labelHil: '⬇️ Mababa', time: tide.lowTide?.time,   level: tide.lowTide?.level   },
    { labelEn: '⬆️ High',  labelHil: '⬆️ Mataas', time: tide.highTide2?.time, level: tide.highTide2?.level },
    { labelEn: '⬇️ Low',   labelHil: '⬇️ Mababa', time: tide.lowTide2?.time,  level: tide.lowTide2?.level  },
  ].filter(e => e.time).map(e => ({ ...e, hourDecimal: parseHour(e.time) }))
  const upcoming = events.filter(e => e.hourDecimal > nowH).sort((a, b) => a.hourDecimal - b.hourDecimal)
  return upcoming[0] ?? events.sort((a, b) => a.hourDecimal - b.hourDecimal)[0]
}

function magColor(mag) {
  if (mag >= 6.0) return 'text-red-600 dark:text-red-400'
  if (mag >= 5.0) return 'text-orange-500 dark:text-orange-400'
  if (mag >= 4.0) return 'text-amber-500 dark:text-amber-400'
  return 'text-zinc-500 dark:text-zinc-400'
}

function magBadge(mag) {
  if (mag >= 6.0) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  if (mag >= 5.0) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
  if (mag >= 4.0) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
}

function timeAgo(epochMs) {
  const diff = Math.floor((Date.now() - epochMs) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export default function TideCard() {
  const { t }                       = useLang()
  const [data,    setData]           = useState(null)
  const [loading, setLoading]        = useState(true)
  const [error,   setError]          = useState(null)
  const [nowH,    setNowH]           = useState(() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60 })
  const [quakes,  setQuakes]         = useState([])
  const [eqLoad,  setEqLoad]         = useState(true)
  const [eqError, setEqError]        = useState(false)

  useEffect(() => {
    const tick = setInterval(() => { const n = new Date(); setNowH(n.getHours() + n.getMinutes() / 60) }, 60_000)
    return () => clearInterval(tick)
  }, [])

  // Tide fetch
  useEffect(() => {
    const ctrl = new AbortController()
    async function fetchTide() {
      try {
        const res = await fetch('/api/tide', { signal: ctrl.signal })
        if (!res.ok) throw new Error(`Tide API ${res.status}`)
        setData(await res.json()); setError(null)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally { setLoading(false) }
    }
    fetchTide()
    const iv = setInterval(fetchTide, REFRESH_MS)
    return () => { ctrl.abort(); clearInterval(iv) }
  }, [])

  // Earthquake fetch — USGS GeoJSON API
  useEffect(() => {
    async function fetchQuakes() {
      try {
        setEqLoad(true)
        const res = await fetch(USGS_URL)
        if (!res.ok) throw new Error('USGS error')
        const json = await res.json()
        setQuakes(json.features ?? [])
        setEqError(false)
      } catch {
        setEqError(true)
      } finally {
        setEqLoad(false)
      }
    }
    fetchQuakes()
    const iv = setInterval(fetchQuakes, EQ_REFRESH)
    return () => clearInterval(iv)
  }, [])

  const tide     = data ?? TIDE
  const events   = buildEventsFromTide(tide)
  const hourly   = buildHourlyProfile(events)
  const next     = nextEvent(tide, nowH)
  const nowIdx   = Math.round(nowH)
  const curLevel = hourly[nowIdx] ?? tide.currentLevel

  const maxLevel  = Math.max(...hourly)
  const pct       = curLevel / maxLevel
  const levelColor = pct > 0.75 ? 'text-blue-600 dark:text-blue-400'
                   : pct > 0.4  ? 'text-brand-600 dark:text-brand-400'
                   :              'text-cyan-600 dark:text-cyan-400'

  const labels = Array.from({ length: 25 }, (_, i) => {
    const h = i % 12 === 0 ? (i === 0 ? '12AM' : '12PM') : `${i % 12}${i < 12 ? 'AM' : 'PM'}`
    return (i % 3 === 0) ? h : ''
  })

  const pointColors = hourly.map((_, i) => i === nowIdx ? '#01696f' : 'transparent')
  const pointRadii  = hourly.map((_, i) => i === nowIdx ? 5 : 0)

  const chartData = {
    labels,
    datasets: [{
      data: hourly,
      borderColor:     '#01696f',
      backgroundColor: 'rgba(1,105,111,0.10)',
      borderWidth:     2,
      fill:            true,
      tension:         0.4,
      pointBackgroundColor: pointColors,
      pointRadius:          pointRadii,
      pointHoverRadius:     4,
    }],
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend:  { display: false },
      tooltip: { callbacks: { title: (items) => items[0].label || `${items[0].dataIndex}:00`, label: (item) => ` ${item.parsed.y} m` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
      y: { min: 0, suggestedMax: Math.ceil(maxLevel * 1.2), grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 10 }, callback: (v) => `${v}m` } },
    },
  }

  const nowMinutes = nowH * 60
  const diffMin    = next?.hourDecimal ? Math.round(next.hourDecimal * 60 - nowMinutes) : null
  const countdown  = diffMin !== null
    ? diffMin > 0 ? t(`in ${Math.floor(diffMin/60)}h ${diffMin%60}m`, `sulod sa ${Math.floor(diffMin/60)}h ${diffMin%60}m`) : t('soon', 'malip-ot lang')
    : ''

  const tideEvents = [
    { labelEn: '⬆️ High 1', labelHil: '⬆️ Mataas 1', time: tide.highTide?.time,  level: tide.highTide?.level  },
    { labelEn: '⬇️ Low 1',  labelHil: '⬇️ Mababa 1', time: tide.lowTide?.time,   level: tide.lowTide?.level   },
    { labelEn: '⬆️ High 2', labelHil: '⬆️ Mataas 2', time: tide.highTide2?.time, level: tide.highTide2?.level },
    { labelEn: '⬇️ Low 2',  labelHil: '⬇️ Mababa 2', time: tide.lowTide2?.time,  level: tide.lowTide2?.level  },
  ].filter(e => e.time && e.level != null)

  return (
    <section
      className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full flex flex-col gap-5"
      aria-label={t('Iloilo Port tide and earthquake information', 'Impormasyon sang tubig kag linog')}
    >
      {/* ── TIDE SECTION ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            🌊 {t('Iloilo Port Tide', 'Tubig sang Pantalan')}
          </h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-xs text-zinc-400 animate-pulse" aria-live="polite">{t('Loading…', 'Nagkarga…')}</span>}
            {error   && <span className="text-[11px] text-amber-500" role="status">⚠ {t('Mock data', 'Huwad nga datos')}</span>}
            {!loading && !error && <span className="text-[11px] text-zinc-400">PAGASA Tide Tables 2026</span>}
          </div>
        </div>

        <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
          <div>
            <div className={`tabular text-4xl font-bold ${levelColor}`}
              aria-label={t(`Current tide level: ${curLevel} metres`, `Antas sang tubig subong: ${curLevel} metro`)}>
              {curLevel}<span className="text-base font-normal ml-1">m</span>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">{tide.station ?? tide.river ?? 'Iloilo River / Port'}</div>
          </div>
          {next && (
            <div className="text-right">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {t(next.labelEn, next.labelHil)} — {next.level}m
              </div>
              <div className="text-xs text-zinc-400">
                @ {next.time} · <span className="font-medium text-brand-600 dark:text-brand-400">{countdown}</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-[110px] mb-3" role="img" aria-label={t('24-hour tide profile chart', '24-oras nga tsart sang tubig')}>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {tideEvents.map((e) => {
            const isPast = parseHour(e.time) < nowH
            return (
              <div key={e.labelEn} className={`flex items-center justify-between text-xs rounded-md px-2 py-1 ${
                isPast ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50'
              }`}>
                <span>{t(e.labelEn, e.labelHil)}</span>
                <span className="font-semibold tabular">{e.level}m</span>
                <span className="text-zinc-400 tabular ml-2">{e.time}</span>
              </div>
            )
          })}
        </div>

        {tide.datum && (
          <div className="text-[10px] text-zinc-400 border-t border-black/5 dark:border-white/5 pt-2 mt-3">
            Datum: {tide.datum} · Station No. {tide.stationNo}
          </div>
        )}
      </div>

      {/* ── EARTHQUAKE SECTION ── */}
      <div className="border-t border-black/8 dark:border-white/8 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            🚨 {t('Philippines Earthquakes', 'Mga Linog sa Pilipinas')}
          </h2>
          <div className="flex items-center gap-1.5">
            {eqLoad && <span className="text-xs text-zinc-400 animate-pulse">{t('Loading…', 'Nagkarga…')}</span>}
            {!eqLoad && !eqError && (
              <span className="text-[10px] text-zinc-400">USGS · M2.5+ · 1200 km radius</span>
            )}
            {eqError && <span className="text-[11px] text-amber-500">⚠ {t('No data', 'Walay datos')}</span>}
          </div>
        </div>

        {quakes.length === 0 && !eqLoad && (
          <p className="text-xs text-zinc-400 italic">{t('No recent earthquakes recorded.', 'Wala sang linog nga na-rekord.')}</p>
        )}

        <div className="flex flex-col gap-1.5">
          {quakes.map((q) => {
            const props = q.properties
            const mag   = props.mag?.toFixed(1) ?? '?'
            const place = props.place ?? 'Philippines region'
            const ago   = timeAgo(props.time)
            const mtype = props.magType ?? ''
            return (
              <a
                key={q.id}
                href={props.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors group"
                aria-label={`Magnitude ${mag} earthquake: ${place}, ${ago}`}
              >
                {/* Magnitude badge */}
                <span className={`shrink-0 w-10 text-center text-xs font-bold rounded-md px-1 py-0.5 tabular ${magBadge(parseFloat(mag))}`}>
                  M{mag}
                </span>
                {/* Location */}
                <span className="flex-1 text-xs text-zinc-700 dark:text-zinc-200 truncate">{place}</span>
                {/* Time ago + mag type */}
                <span className="shrink-0 text-[10px] text-zinc-400 text-right">
                  <span className="block">{ago}</span>
                  {mtype && <span className="block opacity-60">{mtype}</span>}
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
