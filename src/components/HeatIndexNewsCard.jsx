import { useHeatIndexNews } from '../hooks/useHeatIndexNews'
import { useCdrrmoAdvisories } from '../hooks/useCdrrmoAdvisories'
import { dedupeAdvisories } from '../utils/dedupeAdvisories'
import { HEAT_INDEX_NEWS } from '../data/mockData'

const LEVEL_BADGE = {
  'Danger':          'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  'Extreme Caution': 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  'Caution':         'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
}

export default function HeatIndexNewsCard() {
  const { data: newsData, loading: newsLoading, error: newsError } = useHeatIndexNews()
  const { data: cdrrmoData, loading: cdrrmoLoading }               = useCdrrmoAdvisories()

  // Merge news + CDRRMO advisories, dedupe, sort by date descending, cap at 8
  const rawItems = [
    ...(newsData?.items ?? HEAT_INDEX_NEWS),
    ...(cdrrmoData?.items ?? []),
  ]
  const items = dedupeAdvisories(rawItems)
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0
      const db = b.date ? new Date(b.date).getTime() : 0
      return db - da
    })
    .slice(0, 8)

  const isLoading  = newsLoading || cdrrmoLoading
  const isFallback = newsData?.isFallback

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          📰 Heat Index & Advisory Feed
        </h2>
        <div className="flex items-center gap-2">
          {isLoading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
          {isFallback && !isLoading && (
            <span className="text-[11px] text-amber-500">⚠ static fallback</span>
          )}
          {!isFallback && !isLoading && (
            <span className="text-[11px] text-zinc-400">CDRRMO + PAGASA</span>
          )}
        </div>
      </div>

      {/* Source note */}
      {newsError && (
        <div className="text-xs text-red-400 mb-2">
          Could not load live feed. Showing cached items.
        </div>
      )}

      {/* Advisory items */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] scrollbar-thin pr-0.5">
        {items.length === 0 && !isLoading && (
          <div className="text-sm text-zinc-400 text-center py-8">No advisories found.</div>
        )}
        {items.map((n) => (
          <a
            key={n.id ?? n.title}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200 leading-tight">
                  {n.title}
                </div>
                {n.summary && (
                  <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.summary}</div>
                )}
              </div>
              {n.level && (
                <span
                  className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                    LEVEL_BADGE[n.level] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200'
                  }`}
                >
                  {n.level}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
              <span>{n.source}</span>
              {n.date && <><span>·</span><span>{n.date}</span></>}
              {n.type && <><span>·</span><span className="capitalize">{n.type}</span></>}
            </div>
          </a>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-[11px] text-zinc-400 flex justify-between">
        <span>Refreshes every 15 min</span>
        <a
          href="https://cdrrmo.iloilocity.gov.ph/fb-updates/heat-index-forecast/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 hover:underline"
        >
          CDRRMO Full Feed →
        </a>
      </div>
    </div>
  )
}
