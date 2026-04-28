/**
 * NewsPage — Public news feed from scraped D1 data
 * - Auto-refreshes every 30 minutes in the background
 * - Urgent items (MORE Power, traffic, critical CDRRMO) pinned to top
 * - Category tabs, search, 3-col card grid
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const AUTO_REFRESH_MS = 30 * 60 * 1000  // 30 minutes

const CATEGORIES = [
  { key: 'all',        label: 'All',          icon: '📰' },
  { key: 'more-power', label: 'Power / MORE',  icon: '⚡' },
  { key: 'energy',     label: 'Energy News',   icon: '⛽' },
  { key: 'traffic',    label: 'Traffic',       icon: '🚦' },
  { key: 'pagasa',     label: 'Weather',       icon: '🌤️' },
  { key: 'cdrrmo',     label: 'CDRRMO',        icon: '🚨' },
  { key: 'mcwd',       label: 'Water / MCWD',  icon: '💧' },
  { key: 'news',       label: 'Local News',    icon: '🗳️' },
]

const SOURCE_LABELS = {
  'more-power':        'MORE Electric & Power',
  'energy':            'Energy News',
  'traffic':           'Traffic & Incidents',
  'pagasa-heat-index': 'PAGASA — Heat Index',
  'pagasa-weather':    'PAGASA — Weather',
  'pagasa':            'PAGASA',
  'cdrrmo':            'CDRRMO Iloilo',
  'mcwd':              'MCWD Water',
  'fuel':              'DOE Fuel Prices',
  'news':              'Local News',
}

const CATEGORY_COLORS = {
  'more-power':        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'energy':            'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'traffic':           'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
  'pagasa-heat-index': 'bg-rose-100   text-rose-800   dark:bg-rose-900/40   dark:text-rose-300',
  'pagasa-weather':    'bg-sky-100    text-sky-800    dark:bg-sky-900/40    dark:text-sky-300',
  'pagasa':            'bg-sky-100    text-sky-800    dark:bg-sky-900/40    dark:text-sky-300',
  'cdrrmo':            'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'mcwd':              'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300',
  'fuel':              'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  'news':              'bg-zinc-100   text-zinc-700   dark:bg-zinc-800      dark:text-zinc-300',
}

// Urgent = MORE Power outages, traffic accidents, or CDRRMO emergency posts
const URGENT_KEYS = ['more-power', 'traffic', 'cdrrmo']
const URGENT_KW   = /outage|interrupt|accident|crash|collision|emergency|alert|warning|critical|reroute|flood|suspend/i

function isUrgent(item) {
  return URGENT_KEYS.includes(item.source_key) &&
    URGENT_KW.test((item.title ?? '') + ' ' + (item.summary ?? ''))
}

function sortWithUrgent(items) {
  const urgent = items.filter(isUrgent)
  const normal = items.filter(i => !isUrgent(i))
  return [...urgent, ...normal]
}

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 36e5)
  const d = Math.floor(diff / 864e5)
  if (h < 1)  return 'Just now'
  if (h < 24) return `${h}h ago`
  if (d < 7)  return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function NewsCard({ item, pinned }) {
  const catColor   = CATEGORY_COLORS[item.source_key] ?? CATEGORY_COLORS.news
  const catLabel   = SOURCE_LABELS[item.source_key]   ?? item.source_key
  const sourceMeta = (() => { try { return JSON.parse(item.raw_data ?? '{}') } catch { return {} } })()

  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${
        pinned
          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 hover:border-red-400'
          : 'border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-[#01696f]/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {pinned && <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">🚨 URGENT</span>}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${catColor}`}>
            {catLabel}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 shrink-0">{relativeTime(item.scraped_at ?? item.pub_date)}</span>
      </div>

      <h3 className={`text-sm font-semibold leading-snug line-clamp-3 mb-1.5 group-hover:text-[#01696f] dark:group-hover:text-teal-400 ${
        pinned ? 'text-red-900 dark:text-red-100' : 'text-zinc-800 dark:text-zinc-100'
      }`}>
        {item.title}
      </h3>

      {item.summary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">{item.summary}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5 dark:border-white/5">
        <span className="text-[10px] text-zinc-400">
          {sourceMeta.source ?? catLabel}{item.pub_date && ` · ${item.pub_date}`}
        </span>
        {item.url && (
          <span className="text-[10px] text-[#01696f] dark:text-teal-400 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Read more
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 2.5h7m0 0v7m0-7L2.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2 animate-pulse">
      <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
      <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
    </div>
  )
}

export default function NewsPage() {
  const [activeTab,    setActiveTab]    = useState('all')
  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [search,       setSearch]       = useState('')
  const [nextRefresh,  setNextRefresh]  = useState(null) // timestamp of next auto-refresh
  const [countdown,    setCountdown]    = useState('')
  const timerRef = useRef(null)
  const countRef = useRef(null)

  const fetchNews = useCallback(async (tab, silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    const sourceParam = tab === 'pagasa' ? 'all' : tab
    try {
      const res  = await fetch(`/api/scrape?source=${encodeURIComponent(sourceParam)}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setLastUpdated(data.updatedAt)
    } catch (e) {
      setError('Could not load news. Try again later.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial fetch + schedule auto-refresh
  useEffect(() => {
    fetchNews(activeTab)
    scheduleRefresh(activeTab)
    return () => { clearTimeout(timerRef.current); clearInterval(countRef.current) }
  }, [activeTab])

  function scheduleRefresh(tab) {
    clearTimeout(timerRef.current)
    clearInterval(countRef.current)
    const next = Date.now() + AUTO_REFRESH_MS
    setNextRefresh(next)

    // Countdown display — updates every 30s
    countRef.current = setInterval(() => {
      const remaining = next - Date.now()
      if (remaining <= 0) { clearInterval(countRef.current); return }
      const m = Math.floor(remaining / 60000)
      const s = Math.floor((remaining % 60000) / 1000)
      setCountdown(`${m}:${String(s).padStart(2, '0')}`)
    }, 30_000)
    setCountdown(`${AUTO_REFRESH_MS / 60000}:00`)

    // Fire silent refresh after 30 min
    timerRef.current = setTimeout(() => {
      fetchNews(tab, true)
      scheduleRefresh(tab)
    }, AUTO_REFRESH_MS)
  }

  function manualRefresh() {
    fetchNews(activeTab)
    scheduleRefresh(activeTab)
  }

  function filterItems(all) {
    let filtered = all
    if (activeTab === 'pagasa') {
      filtered = all.filter(i => i.source_key?.startsWith('pagasa'))
    } else if (activeTab !== 'all') {
      filtered = all.filter(i => i.source_key === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.summary?.toLowerCase().includes(q)
      )
    }
    return sortWithUrgent(filtered)
  }

  const visible    = filterItems(items)
  const urgentCount = visible.filter(isUrgent).length

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
            📰 Iloilo City News & Alerts
            {urgentCount > 0 && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                {urgentCount} urgent
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            MORE Power · PAGASA · CDRRMO · MCWD · Local News
            {lastUpdated && ` · updated ${relativeTime(lastUpdated)}`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {countdown && (
            <span className="text-[10px] text-zinc-400 tabular-nums">
              ⏱ refresh in {countdown}
            </span>
          )}
          <button
            onClick={manualRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-[#01696f] transition-colors disabled:opacity-50"
          >
            {loading
              ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              : '↻'
            }
            Refresh
          </button>
        </div>
      </div>

      {/* Urgent alert banner */}
      {urgentCount > 0 && (
        <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-4 py-3 flex items-start gap-3">
          <span className="text-lg shrink-0">🚨</span>
          <div>
            <div className="text-sm font-bold text-red-700 dark:text-red-300">
              {urgentCount} urgent alert{urgentCount > 1 ? 's' : ''} detected
            </div>
            <div className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
              Power interruptions, traffic incidents, or CDRRMO advisories are pinned at the top.
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search news and alerts…"
          className="w-full pl-8 pr-4 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-[#01696f]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs">×</button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat.key}
            onClick={() => { setActiveTab(cat.key); setSearch('') }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              activeTab === cat.key
                ? 'bg-[#01696f] text-white border-[#01696f]'
                : 'bg-white dark:bg-zinc-900 text-zinc-500 border-black/10 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-500'
            }`}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 py-16 text-center">
          <div className="text-3xl mb-3">📬</div>
          <div className="text-sm font-semibold text-zinc-500">
            {search ? `No results for “${search}”` : 'No news yet for this category'}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {search ? 'Try a different keyword' : 'Run the scraper from the Admin Panel to populate this feed'}
          </div>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="text-xs text-zinc-400">
          {visible.length} {visible.length === 1 ? 'item' : 'items'}
          {search && ` matching “${search}”`}
          {urgentCount > 0 && ` · ${urgentCount} pinned urgent`}
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((item, i) => (
            <NewsCard key={item.id ?? i} item={item} pinned={isUrgent(item)} />
          ))}
        </div>
      )}

    </div>
  )
}
