import useIncidentStore    from '../store/useIncidentStore'
import { useWeather }       from '../hooks/useWeather'
import { useUtilityAlerts } from '../hooks/useUtilityAlerts'
import useKitchenStore      from '../store/useKitchenStore'

export default function KpiBar() {
  const { weather } = useWeather()
  const incidents   = useIncidentStore((s) => s.incidents)
  const { alerts }  = useUtilityAlerts()
  const { getToday } = useKitchenStore()

  const activeIncidents = incidents.filter((i) => i.status === 'active').length
  const activeAlerts    = alerts.filter((a) => a.severity === 'warning' || a.severity === 'critical').length
  const heatIndex       = weather?.heatIndex    ?? '—'
  const heatIndexCls    = weather?.heatIndexCls ?? 'text-orange-500'
  const todayKitchen    = getToday()

  const KPI_STATS = [
    {
      id:    'k1',
      label: 'Utility Alerts',
      value: activeAlerts,
      color: activeAlerts > 0 ? 'text-red-500' : 'text-green-500',
      sub:   'active warnings · D1',
    },
    {
      id:    'k2',
      label: 'Incidents',
      value: activeIncidents,
      color: activeIncidents > 2 ? 'text-yellow-500' : 'text-zinc-500',
      sub:   'active reports',
    },
    {
      id:    'k3',
      label: 'Families Fed Today',
      value: todayKitchen?.families ?? '—',
      color: 'text-[#01696f]',
      sub:   'community kitchen · D1',
    },
    {
      id:    'k4',
      label: 'Heat Index',
      value: heatIndex,
      unit:  heatIndex !== '—' ? '°C' : '',
      color: heatIndexCls,
      sub:   weather ? 'Open-Meteo · live' : 'fallback',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {KPI_STATS.map((k) => (
        <div key={k.id}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{k.label}</div>
          <div className="flex items-end justify-between">
            <div className={`tabular text-2xl font-bold ${k.color}`}>
              {k.value}{k.unit ?? ''}
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">{k.sub}</div>
        </div>
      ))}
    </div>
  )
}
