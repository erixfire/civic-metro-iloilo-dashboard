/**
 * AdminScraperPanel — Admin tab for triggering scrapers and viewing results
 */
import { useState } from 'react'

const SOURCES = [
  { key: 'all',     label: 'All Sources',   icon: '📡' },
  { key: 'more',    label: 'MORE Power',    icon: '⚡' },
  { key: 'energy',  label: 'Energy News',   icon: '⛽' },
  { key: 'traffic', label: 'Traffic',       icon: '🚦' },
  { key: 'pagasa',  label: 'PAGASA',        icon: '🌤️' },
  { key: 'cdrrmo',  label: 'CDRRMO',        icon: '🚨' },
  { key: 'mcwd',    label: 'MCWD Water',    icon: '💧' },
  { key: 'fuel',    label: 'DOE Fuel',      icon: '⛽' },
  { key: 'news',    label: 'Local News',    icon: '📰' },
]

export default function AdminScraperPanel({ getToken }) {
  const [activeSource, setActiveSource] = useState('all')
  const [status,       setStatus]       = useState(null)
  const [running,      setRunning]      = useState(false)
  const [items,        setItems]        = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  async function triggerScrape(source) {
    setRunning(true); setStatus(null)
    try {
      const token = getToken?.()
      const res   = await fetch('/api/scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:    JSON.stringify({ source }),
      })
      const d = await res.json()
      setStatus(d)
      loadItems(source)
    } catch (e) {
      setStatus({ error: e.message })
    } finally {
      setRunning(false)
    }
  }

  async function loadItems(source) {
    setLoadingItems(true)
    try {
      const res  = await fetch(`/api/scrape?source=${encodeURIComponent(source)}`)
      const data = await res.json()
      setItems(data.items ?? [])
    } catch (_) {}
    finally { setLoadingItems(false) }
  }

  function selectSource(key) { setActiveSource(key); setStatus(null); loadItems(key) }

  return (
    <div className="space-y-4">

      {/* Source tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {SOURCES.map(s => (
          <button key={s.key} onClick={() => selectSource(s.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              activeSource === s.key
                ? 'bg-[#01696f] text-white border-[#01696f]'
                : 'bg-white dark:bg-zinc-900 text-zinc-500 border-black/10 dark:border-white/10 hover:border-zinc-400'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Trigger */}
      <div className="flex items-center gap-3">
        <button onClick={() => triggerScrape(activeSource)} disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#01696f] hover:bg-[#015a5f] disabled:opacity-50 text-white text-sm font-semibold transition-colors">
          {running
            ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Scraping…</>
            : <>📡 Run {SOURCES.find(s => s.key === activeSource)?.label} Scraper</>
          }
        </button>
        <span className="text-xs text-zinc-400">Writes results to D1 → public /news page</span>
      </div>

      {/* Result summary */}
      {status && (
        <div className={`rounded-xl border px-4 py-3 text-xs ${
          status.error
            ? 'border-red-200 bg-red-50 dark:bg-red-900/20 text-red-600'
            : 'border-green-200 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
        }`}>
          {status.error ? <span>❌ {status.error}</span> : (
            <div className="space-y-1">
              <div className="font-semibold">✅ {status.totalScraped} fetched — {status.totalSaved} new/updated saved to D1</div>
              {status.results && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-2">
                  {Object.entries(status.results).map(([key, r]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${ r.error ? 'bg-red-400' : 'bg-green-400' }`} />
                      <span className="capitalize">{key}</span>
                      <span className="text-zinc-400">{r.error ? `— ${r.error}` : `×${r.scraped}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      <div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
          {loadingItems ? 'Loading…' : `${items.length} stored — ${SOURCES.find(s => s.key === activeSource)?.label}`}
        </div>
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {items.length === 0 && !loadingItems && (
            <div className="text-xs text-zinc-400 py-6 text-center">No items yet — run the scraper above.</div>
          )}
          {items.map((item, i) => (
            <div key={item.id ?? i} className="rounded-lg border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-[#01696f] hover:underline leading-tight line-clamp-2">
                  {item.title}
                </a>
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500">
                  {item.source_key}
                </span>
              </div>
              {item.summary && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{item.summary}</p>}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-zinc-400">{item.pub_date} · scraped {item.scraped_at?.slice(0, 16)}</span>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-[#01696f] hover:underline font-semibold">
                    🔗 Source ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
