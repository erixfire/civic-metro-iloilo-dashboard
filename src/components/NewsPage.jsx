/**
 * NewsPage — Public news feed from scraped D1 data
 * Tabs: All | MORE Power | Energy | Traffic | Weather | Local News
 * Each item links directly to the original source article.
 */
import { useState, useEffect } from 'react'

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
  'more-power':         'MORE Electric & Power',
  'energy':             'Energy News',
  'traffic':            'Traffic & Incidents',
  'pagasa-heat-index':  'PAGASA — Heat Index',
  'pagasa-weather':     'PAGASA — Weather',
  'pagasa':             'PAGASA',
  'cdrrmo':             'CDRRMO Iloilo',
  'mcwd':               'MCWD Water',
  'fuel':               'DOE Fuel Prices',
  'news':               'Local News',
}

const CATEGORY_COLORS = {
  'more-power':         'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'energy':             'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'traffic':            'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
  'pagasa-heat-index':  'bg-rose-100   text-rose-800   dark:bg-rose-900/40   dark:text-rose-300',
  'pagasa-weather':     'bg-sky-100    text-sky-800    dark:bg-sky-900/40    dark:text-sky-300',
  'pagasa':             'bg-sky-100    text-sky-800    dark:bg-sky-900/40    dark:text-sky-300',
  'cdrrmo':             'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'mcwd':               'bg-blue-100   text-blue-800   dark:bg-blue-900/40   dark:text-blue-300',
  'fuel':               'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  'news':               'bg-zinc-100   text-zinc-700   dark:bg-zinc-800      dark:text-zinc-300',
}

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h    = Math.floor(diff / 36e5)
  const d    = Math.floor(diff / 864e5)
  if (h < 1)   return 'Just now'
  if (h < 24)  return `${h}h ago`
  if (d < 7)   return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function NewsCard({ item }) {
  const catColor   = CATEGORY_COLORS[item.source_key] ?? CATEGORY_COLORS.news
  const catLabel   = SOURCE_LABELS[item.source_key]   ?? item.source_key
  const sourceMeta = (() => { try { return JSON.parse(item.raw_data ?? '{}') } catch { return {} } })()

  return (
    <a
      href={item.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-sm hover:shadow-md hover:border-[#01696f]/40 transition-all"
    >
      {/* Category + time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${catColor}`}>
          {catLabel}
        </span>
        <span className="text-[10px] text-zinc-400 shrink-0">
          {relativeTime(item.scraped_at ?? item.pub_date)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-snug group-hover:text-[#01696f] dark:group-hover:text-teal-400 line-clamp-3 mb-1.5">
        {item.title}
      </h3>

      {/* Summary */}
      {item.summary && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
          {item.summary}
        </p>
      )}

      {/* Footer: source name + external link icon */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5 dark:border-white/5">
        <span className="text-[10px] text-zinc-400">
          {sourceMeta.source ?? catLabel}
          {item.pub_date && ` · ${item.pub_date}`}
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
  const [activeTab,   setActiveTab]   = useState('all')
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [search,      setSearch]      = useState('')

  useEffect(() => { fetchNews(activeTab) }, [activeTab])

  async function fetchNews(tab) {
    setLoading(true)
    setError(null)
    // Map tab key to API source params
    // pagasa tab fetches both pagasa-heat-index and pagasa-weather
    const sourceParam = tab === 'pagasa'
      ? 'all'   // fetch all, then filter client-side
      : tab
    try {
      const res  = await fetch(`/api/scrape?source=${encodeURIComponent(sourceParam)}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setLastUpdated(data.updatedAt)
    } catch (e) {
      setError('Could not load news. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering for tabs that map to multiple source_keys
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
    return filtered
  }

  const visible = filterItems(items)

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">📰 Iloilo City News & Alerts</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Scraped from MORE Power, PAGASA, CDRRMO, MCWD, and local news sources
            {lastUpdated && ` · updated ${relativeTime(lastUpdated)}`}
          </p>
        </div>
        <button
          onClick={() => fetchNews(activeTab)}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-[#01696f] transition-colors disabled:opacity-50"
        >
          {loading
            ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
            : '↻'
          }
          Refresh
        </button>
      </div>

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
          <button
            key={cat.key}
            onClick={() => { setActiveTab(cat.key); setSearch('') }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              activeTab === cat.key
                ? 'bg-[#01696f] text-white border-[#01696f]'
                : 'bg-white dark:bg-zinc-900 text-zinc-500 border-black/10 dark:border-white/10 hover:border-zinc-400 dark:hover:border-zinc-500'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
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

      {/* Results count */}
      {!loading && visible.length > 0 && (
        <div className="text-xs text-zinc-400">
          {visible.length} {visible.length === 1 ? 'item' : 'items'}
          {search && ` matching “${search}”`}
        </div>
      )}

      {/* News grid */}
      {!loading && visible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((item, i) => (
            <NewsCard key={item.id ?? i} item={item} />
          ))}
        </div>
      )}

    </div>
  )
}
