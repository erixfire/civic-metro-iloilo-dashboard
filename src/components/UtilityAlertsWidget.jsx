import { useUtilityAlerts } from '../hooks/useUtilityAlerts'

const SEVERITY_STYLES = {
  warning:  'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700',
  info:     'bg-blue-50  dark:bg-blue-950/40  border-blue-300  dark:border-blue-700',
  critical: 'bg-red-50   dark:bg-red-950/40   border-red-300   dark:border-red-700',
}

const SEVERITY_BADGE = {
  warning:  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  info:     'bg-blue-100  text-blue-800  dark:bg-blue-900  dark:text-blue-200',
  critical: 'bg-red-100   text-red-800   dark:bg-red-900   dark:text-red-200',
}

const TYPE_ICON = {
  power:        '⚡',
  water:        '💧',
  outage:       '⚡',
  maintenance:  '🔧',
  advisory:     '📌',
  restoration:  '✅',
}

// Default source URLs per provider — used as fallback when alert.source_url is not set
const PROVIDER_URLS = {
  'MORE Electric':      'https://www.more.com.ph/advisories/',
  'MORE Power':         'https://www.more.com.ph/power-interruption-notices/',
  'MCWD':               'https://www.mcwd.gov.ph/advisories/',
  'Metro Iloilo Water': 'https://www.mcwd.gov.ph/service-interruptions/',
  'ILOILO WATER':       'https://www.mcwd.gov.ph/service-interruptions/',
}

function getSourceUrl(alert) {
  if (alert.source_url) return alert.source_url
  // Try to match provider name against known URLs
  const providerKey = Object.keys(PROVIDER_URLS).find(k =>
    alert.provider?.toLowerCase().includes(k.toLowerCase())
  )
  return providerKey ? PROVIDER_URLS[providerKey] : null
}

export default function UtilityAlertsWidget() {
  const { alerts, loading, fromD1, lastFetched, refetch } = useUtilityAlerts()

  const activeWarnings = alerts.filter((a) => a.severity === 'warning' || a.severity === 'critical').length

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            ⚡ Utility Advisories
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${ fromD1 ? 'bg-green-500' : 'bg-zinc-400' }`} />
            <span className="text-[10px] text-zinc-400">
              {fromD1 ? 'Live · D1' : 'Mock data'}
              {lastFetched && ` · ${new Date(lastFetched).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            <button onClick={refetch} className="text-[10px] text-zinc-400 hover:text-brand-600 ml-1">↻</button>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          activeWarnings > 0
            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
            : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
        }`}>
          {loading ? '…' : `${activeWarnings} Active`}
        </span>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="text-xs text-zinc-400 text-center py-8">✅ No active utility advisories</div>
      )}

      {!loading && (
        <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1">
          {alerts.map((alert) => {
            const sourceUrl = getSourceUrl(alert)
            return (
              <div key={alert.id}
                className={`rounded-lg border p-3 transition-all ${ SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info }`}>

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TYPE_ICON[alert.type] ?? '⚡'}</span>
                    <div>
                      <div className="font-medium text-sm text-zinc-800 dark:text-zinc-100 leading-tight">{alert.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{alert.provider}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ SEVERITY_BADGE[alert.severity] ?? SEVERITY_BADGE.info }`}>
                      {alert.severity?.charAt(0).toUpperCase() + alert.severity?.slice(1)}
                    </span>
                    {alert.date && <span className="text-xs text-zinc-400">{alert.date}</span>}
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
                  {(alert.timeFrom || alert.timeTo) && (
                    <div><span className="font-semibold">Time:</span> {alert.timeFrom} – {alert.timeTo}</div>
                  )}
                  {alert.areas?.length > 0 && (
                    <div><span className="font-semibold">Areas:</span> {Array.isArray(alert.areas) ? alert.areas.join(', ') : alert.areas}</div>
                  )}
                  {alert.reason && (
                    <div><span className="font-semibold">Reason:</span> {alert.reason}</div>
                  )}
                  {alert.contactNo && (
                    <div><span className="font-semibold">Contact:</span> {alert.contactNo}</div>
                  )}

                  {/* ★ Source link */}
                  {sourceUrl && (
                    <div className="pt-1">
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#01696f] dark:text-teal-400 hover:underline"
                      >
                        🔗 View Full Advisory
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 2.5h7m0 0v7m0-7L2.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
