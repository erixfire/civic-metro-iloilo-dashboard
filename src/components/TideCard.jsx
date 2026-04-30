/**
 * TideCard — Iloilo Port / Iloilo River tide card.
 * Shows current level, next high/low countdown, and a 24-hour tide profile chart.
 * Chart uses cosine interpolation between PAGASA H/L tide events.
 * Falls back to TIDE mock data when API is unavailable.
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
import { TIDE } from '../data/mockData'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const REFRESH_MS = 60 * 60 * 1000

/**
 * Given an array of { hourDecimal, level } tide events sorted by time,
 * returns 25 hourly tide heights (0–24) via cosine interpolation.
 */
function buildHourlyProfile(events) {
  const hours = Array.from({ length: 25 }, (_, i) => i)
  return hours.map((h) => {
    // Find surrounding events (with wrap-around at midnight)
    let prev = events[events.length - 1]
    let next = events[0]
    for (let i = 0; i < events.length; i++) {
      if (events[i].hourDecimal <= h) prev = events[i]
      if (events[i].hourDecimal > h) { next = events[i]; break }
    }
    // Cosine interpolation
    const span = next.hourDecimal > prev.hourDecimal
      ? next.hourDecimal - prev.hourDecimal
      : 24 - prev.hourDecimal + next.hourDecimal
    const elapsed = h >= prev.hourDecimal
      ? h - prev.hourDecimal
      : 24 - prev.hourDecimal + h
    const t = span > 0 ? elapsed / span : 0
    const cos = (1 - Math.cos(Math.PI * t)) / 2
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
    t.lowTide2   ? { hourDecimal: parseHour(t.lowTide2.time),  level: t.lowTide2.level }  : null,
    t.highTide   ? { hourDecimal: parseHour(t.highTide.time),  level: t.highTide.level }  : null,
    t.lowTide    ? { hourDecimal: parseHour(t.lowTide.time),   level: t.lowTide.level }   : null,
    t.highTide2  ? { hourDecimal: parseHour(t.highTide2.time), level: t.highTide2.level } : null,
  ].filter(Boolean).sort((a, b) => a.hourDecimal - b.hourDecimal)
}

function nextEvent(t, nowH) {
  const events = [
    { label: '⬆️ High',  time: t.highTide?.time,  level: t.highTide?.level  },
    { label: '⬇️ Low',   time: t.lowTide?.time,   level: t.lowTide?.level   },
    { label: '⬆️ High',  time: t.highTide2?.time, level: t.highTide2?.level },
    { label: '⬇️ Low',   time: t.lowTide2?.time,  level: t.lowTide2?.level  },
  ].filter(e => e.time).map(e => ({ ...e, hourDecimal: parseHour(e.time) }))
  const upcoming = events.filter(e => e.hourDecimal > nowH).sort((a, b) => a.hourDecimal - b.hourDecimal)
  return upcoming[0] ?? events.sort((a, b) => a.hourDecimal - b.hourDecimal)[0]
}

export default function TideCard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [nowH,    setNowH]    = useState(() => {
    const n = new Date(); return n.getHours() + n.getMinutes() / 60
  })

  useEffect(() => {
    const tick = setInterval(() => {
      const n = new Date(); setNowH(n.getHours() + n.getMinutes() / 60)
    }, 60_000)
    return () => clearInterval(tick)
  }, [])

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

  const t      = data ?? TIDE
  const events = buildEventsFromTide(t)
  const hourly = buildHourlyProfile(events)
  const next   = nextEvent(t, nowH)
  const nowIdx = Math.round(nowH)
  const currentLevel = hourly[nowIdx] ?? t.currentLevel

  // Tide level color
  const maxLevel = Math.max(...hourly)
  const pct = currentLevel / maxLevel
  const levelColor = pct > 0.75 ? 'text-blue-600 dark:text-blue-400'
                   : pct > 0.4  ? 'text-brand-600 dark:text-brand-400'
                   :              'text-cyan-600 dark:text-cyan-400'

  // Chart data
  const labels = Array.from({ length: 25 }, (_, i) => {
    const h = i % 12 === 0 ? (i === 0 ? '12AM' : '12PM') : `${i % 12}${i < 12 ? 'AM' : 'PM'}`
    return (i % 3 === 0) ? h : ''
  })

  const pointColors = hourly.map((_, i) => i === nowIdx ? '#01696f' : 'transparent')
  const pointRadii  = hourly.map((_, i) => i === nowIdx ? 5 : 0)

  const chartData = {
    labels,
    datasets: [{
      data:            hourly,
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
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend:  { display: false },
      tooltip: {
        callbacks: {
          title:  (items) => `${items[0].label || `${items[0].dataIndex}:00`}`,
          label:  (item)  => ` ${item.parsed.y} m`,
        },
      },
    },
    scales: {
      x: {
        grid:  { display: false },
        ticks: { color: '#9ca3af', font: { size: 10 } },
      },
      y: {
        min: 0,
        suggestedMax: Math.ceil(maxLevel * 1.2),
        grid:  { color: 'rgba(0,0,0,0.04)' },
        ticks: { color: '#9ca3af', font: { size: 10 }, callback: (v) => `${v}m` },
      },
    },
  }

  // Next event countdown
  const nowMinutes     = nowH * 60
  const nextMinutes    = next?.hourDecimal ? next.hourDecimal * 60 : null
  const diffMin        = nextMinutes !== null ? Math.round(nextMinutes - nowMinutes) : null
  const countdownLabel = diffMin !== null
    ? diffMin > 0 ? `in ${Math.floor(diffMin / 60)}h ${diffMin % 60}m` : 'soon'
    : ''

  const tideEvents = [
    { label: '⬆️ High 1', time: t.highTide?.time,  level: t.highTide?.level  },
    { label: '⬇️ Low 1',  time: t.lowTide?.time,   level: t.lowTide?.level   },
    { label: '⬆️ High 2', time: t.highTide2?.time, level: t.highTide2?.level },
    { label: '⬇️ Low 2',  time: t.lowTide2?.time,  level: t.lowTide2?.level  },
  ].filter(e => e.time && e.level != null)

  return (
    <section
      className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full"
      aria-label="Iloilo Port tide information"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          🌊 Iloilo Port Tide
        </h2>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-400 animate-pulse" aria-live="polite">Loading…</span>}
          {error   && <span className="text-[11px] text-amber-500" role="status">⚠ Mock data</span>}
          {!loading && !error && <span className="text-[11px] text-zinc-400">PAGASA Tide Tables 2026</span>}
        </div>
      </div>

      {/* Current level + next event */}
      <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
        <div>
          <div
            className={`tabular text-4xl font-bold ${levelColor}`}
            aria-label={`Current tide level: ${currentLevel} metres`}
          >
            {currentLevel}<span className="text-base font-normal ml-1">m</span>
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {t.station ?? t.river ?? 'Iloilo River / Port'}
          </div>
        </div>
        {next && (
          <div className="text-right">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {next.label} — {next.level}m
            </div>
            <div className="text-xs text-zinc-400">@ {next.time} &nbsp;· <span className="font-medium text-brand-600 dark:text-brand-400">{countdownLabel}</span></div>
          </div>
        )}
      </div>

      {/* 24-hour chart */}
      <div className="h-[110px] mb-3" role="img" aria-label="24-hour tide profile chart">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Tide table */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {tideEvents.map((e) => {
          const evH = parseHour(e.time)
          const isPast = evH < nowH
          return (
            <div
              key={e.label}
              className={`flex items-center justify-between text-xs rounded-md px-2 py-1 ${
                isPast
                  ? 'text-zinc-400 dark:text-zinc-500'
                  : 'text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50'
              }`}
            >
              <span>{e.label}</span>
              <span className="font-semibold tabular">{e.level}m</span>
              <span className="text-zinc-400 tabular ml-2">{e.time}</span>
            </div>
          )
        })}
      </div>

      {t.datum && (
        <div className="text-[10px] text-zinc-400 border-t border-black/5 dark:border-white/5 pt-2 mt-3">
          Datum: {t.datum} · Station No. {t.stationNo}
        </div>
      )}
    </section>
  )
}
