/**
 * NewsTickerBanner — scrolling urgent alert ticker.
 * Mobile-optimised: icon-only Alert label at xs, dismiss button meets 44px tap target.
 */
import { useState, useEffect, useRef } from 'react'

const URGENT_KEYS = ['more-power', 'traffic', 'cdrrmo']
const URGENT_KW   = /outage|interrupt|accident|crash|collision|emergency|alert|warning|critical|reroute|flood|suspend/i

function isUrgent(item) {
  return URGENT_KEYS.includes(item.source_key) &&
    URGENT_KW.test((item.title ?? '') + ' ' + (item.summary ?? ''))
}

const SOURCE_ICON = {
  'more-power': '⚡',
  'traffic':    '🚦',
  'cdrrmo':     '🚨',
}

export default function NewsTickerBanner() {
  const [alerts,  setAlerts]  = useState([])
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const intervalRef = useRef(null)
  const refreshRef  = useRef(null)

  useEffect(() => {
    loadAlerts()
    refreshRef.current = setInterval(loadAlerts, 30 * 60 * 1000)
    return () => { clearInterval(intervalRef.current); clearInterval(refreshRef.current) }
  }, [])

  useEffect(() => {
    clearInterval(intervalRef.current)
    if (alerts.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrent(c => (c + 1) % alerts.length)
      }, 6000)
    }
    return () => clearInterval(intervalRef.current)
  }, [alerts])

  async function loadAlerts() {
    try {
      const res  = await fetch('/api/scrape?source=all')
      const data = await res.json()
      const urgent = (data.items ?? []).filter(isUrgent).slice(0, 8)
      setAlerts(urgent)
      if (urgent.length > 0) setCurrent(0)
    } catch (_) {}
  }

  if (!visible || alerts.length === 0) return null

  const item = alerts[current]

  return (
    <div className="relative flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2 mb-3 sm:mb-4 overflow-hidden">
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>

      {/* Label: icon always visible; text label only on sm+ */}
      <span className="text-sm shrink-0" aria-hidden="true">{SOURCE_ICON[item.source_key] ?? '🚨'}</span>
      <span className="hidden sm:inline text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest shrink-0">
        Alert
      </span>

      {/* Divider: sm+ only */}
      <span className="hidden sm:block w-px h-4 bg-red-200 dark:bg-red-800 shrink-0" />

      {/* Alert text */}
      <a
        key={current}
        href={item.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 text-xs font-medium text-red-800 dark:text-red-200 truncate hover:underline"
        style={{ animation: 'fadein 0.4s ease' }}
      >
        {item.title}
      </a>

      {/* Pagination dots */}
      {alerts.length > 1 && (
        <div className="flex items-center gap-1 shrink-0">
          {alerts.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Alert ${i + 1} of ${alerts.length}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === current ? 'bg-red-500' : 'bg-red-200 dark:bg-red-800'
              }`}
            />
          ))}
        </div>
      )}

      {/* Dismiss — 44×44px tap target */}
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 dark:hover:text-red-200 transition-colors -mr-1"
        aria-label="Dismiss alert"
      >
        <span aria-hidden="true" className="text-sm">✕</span>
      </button>

      <style>{`@keyframes fadein { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}
