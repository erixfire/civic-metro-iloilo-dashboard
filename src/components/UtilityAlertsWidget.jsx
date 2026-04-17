import { UTILITY_ALERTS } from '../data/mockData'

const SEVERITY_STYLES = {
  warning:
    'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700',
  info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700',
  critical:
    'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700',
}

const SEVERITY_BADGE = {
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  critical:
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const TYPE_ICON = { power: '⚡', water: '💧' }

export default function UtilityAlertsWidget() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          ⚡ Utility Advisories
        </h2>
        <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-2 py-0.5 rounded-full font-medium">
          {UTILITY_ALERTS.filter((a) => a.severity === 'warning').length} Active
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[340px] scrollbar-thin pr-1">
        {UTILITY_ALERTS.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-3 transition-all ${
              SEVERITY_STYLES[alert.severity]
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{TYPE_ICON[alert.type]}</span>
                <div>
                  <div className="font-medium text-sm text-zinc-800 dark:text-zinc-100 leading-tight">
                    {alert.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {alert.provider}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    SEVERITY_BADGE[alert.severity]
                  }`}
                >
                  {alert.severity.charAt(0).toUpperCase() +
                    alert.severity.slice(1)}
                </span>
                <span className="text-xs text-zinc-400">{alert.date}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="font-semibold">Time:</span> {alert.timeFrom} –{' '}
                {alert.timeTo}
              </div>
              <div>
                <span className="font-semibold">Areas:</span>{' '}
                {alert.areas.join(', ')}
              </div>
              <div>
                <span className="font-semibold">Reason:</span> {alert.reason}
              </div>
              <div>
                <span className="font-semibold">Contact:</span> {alert.contactNo}
              </div>
            </div>
            <div className="text-right text-zinc-400 text-xs mt-1">Details</div>
          </div>
        ))}
      </div>
    </div>
  )
}
