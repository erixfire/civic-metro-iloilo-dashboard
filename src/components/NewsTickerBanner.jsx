/**
 * NewsTickerBanner — scrolling urgent alert ticker for the main dashboard
 * Shows the latest urgent items from MORE Power, traffic, and CDRRMO.
 * Auto-refreshes every 30 minutes. Clicking an item opens the source URL.
 * Hides itself when no urgent items are found.
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

  // Rotate ticker item every 6 seconds
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
    <div className="relative flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 mb-4 overflow-hidden">
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>

      {/* Label */}
      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest shrink-0">
        {SOURCE_ICON[item.source_key] ?? '🚨'} Alert
      </span>

      {/* Divider */}
      <span className="w-px h-4 bg-red-200 dark:bg-red-800 shrink-0" />

      {/* Scrolling content */}
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
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === current ? 'bg-red-500' : 'bg-red-200 dark:bg-red-800'
              }`}
            />
          ))}
        </div>
      )}

      {/* Dismiss */}
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200 text-xs leading-none ml-1"
        aria-label="Dismiss"
      >
        ✕
      </button>

      <style>{`@keyframes fadein { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}
