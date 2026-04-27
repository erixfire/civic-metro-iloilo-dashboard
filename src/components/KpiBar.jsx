import useIncidentStore from '../store/useIncidentStore'
import { useWeather } from '../hooks/useWeather'
import { UTILITY_ALERTS } from '../data/mockData'

export default function KpiBar() {
  const { weather } = useWeather()
  const incidents = useIncidentStore((s) => s.incidents)

  const activeIncidents = incidents.filter((i) => i.status === 'active').length
  const activeAlerts    = UTILITY_ALERTS.filter((a) => a.severity === 'warning').length
  const heatIndex       = weather?.heatIndex ?? 41
  const heatIndexCls    = weather?.heatIndexCls ?? 'text-orange-500'

  const KPI_STATS = [
    {
      id: 'k1',
      label: 'Active Alerts',
      value: activeAlerts,
      unit: '',
      color: activeAlerts > 0 ? 'text-red-500' : 'text-green-500',
      sub: 'utility warnings',
    },
    {
      id: 'k2',
      label: 'Incidents',
      value: activeIncidents,
      unit: '',
      color: activeIncidents > 2 ? 'text-yellow-500' : 'text-zinc-500',
      sub: 'active reports',
    },
    {
      id: 'k3',
      label: 'CSWDO Cases Today',
      value: 14,
      unit: '',
      color: 'text-brand-600',
      sub: 'manual · no live API',
    },
    {
      id: 'k4',
      label: 'Heat Index',
      value: heatIndex,
      unit: '°C',
      color: heatIndexCls,
      sub: weather ? 'Open-Meteo · live' : 'fallback',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {KPI_STATS.map((k) => (
        <div
          key={k.id}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm"
        >
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
            {k.label}
          </div>
          <div className="flex items-end justify-between">
            <div className={`tabular text-2xl font-bold ${k.color}`}>
              {k.value}{k.unit}
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">{k.sub}</div>
        </div>
      ))}
    </div>
  )
}
