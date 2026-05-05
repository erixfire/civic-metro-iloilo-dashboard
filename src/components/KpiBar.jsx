import useIncidentStore    from '../store/useIncidentStore'
import { useWeather }       from '../hooks/useWeather'
import { useUtilityAlerts } from '../hooks/useUtilityAlerts'
import { useFuelPrices }    from '../hooks/useFuelPrices'
import { useLang }          from '../hooks/useLang'

function fmt(v) {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return `₱${Number(v).toFixed(2)}`
}

export default function KpiBar() {
  const { t }                            = useLang()
  const { weather }                      = useWeather()
  const incidents                        = useIncidentStore((s) => s.incidents)
  const { alerts }                       = useUtilityAlerts()
  const { prices, loading: fuelLoading } = useFuelPrices()

  const activeIncidents = incidents.filter((i) => i.status === 'active').length
  const activeAlerts    = alerts.filter((a) => a.severity === 'warning' || a.severity === 'critical').length
  const heatIndex       = weather?.heatIndex    ?? '—'
  const heatIndexCls    = weather?.heatIndexCls ?? 'text-orange-500'
  const gasolinePrice   = prices?.gasoline?.avg ?? null

  const KPI_STATS = [
    {
      id:    'k1',
      icon:  '⚡',
      en:    'Utility Alerts',
      hil:   'Alerto',
      value: activeAlerts,
      color: activeAlerts > 0 ? 'text-red-500' : 'text-green-500',
      subEn:  activeAlerts > 0 ? 'Active alert' : 'No alerts',
      subHil: activeAlerts > 0 ? 'May aktibo nga alerto' : 'Wala sang alerto',
    },
    {
      id:    'k2',
      icon:  '📌',
      en:    'Active Incidents',
      hil:   'Aktibo nga Insidente',
      value: activeIncidents,
      color: activeIncidents > 2 ? 'text-yellow-500' : 'text-zinc-600 dark:text-zinc-300',
      subEn:  'active reports',
      subHil: 'aktibo nga report',
    },
    {
      id:    'k3',
      icon:  '🌡️',
      en:    'Heat Index',
      hil:   'Kainit sang Hangin',
      value: heatIndex,
      unit:  heatIndex !== '—' ? '°C' : '',
      color: heatIndexCls,
      subEn:  weather?.heatIndexLabel ?? 'PAGASA',
      subHil: weather?.heatIndexLabel ?? 'PAGASA',
    },
    {
      id:    'k4',
      icon:  '⛽',
      en:    'Gasoline',
      hil:   'Presyo sang Gasolina',
      value: fuelLoading ? '…' : fmt(gasolinePrice),
      color: 'text-zinc-700 dark:text-zinc-200',
      subEn:  'per litre · DOE',
      subHil: 'kada litro · DOE',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 sm:mb-5">
      {KPI_STATS.map((k) => (
        <div
          key={k.id}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-3 shadow-sm"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base" aria-hidden="true">{k.icon}</span>
            <div className="min-w-0">
              {/* label truncates; title attr surfaces full text on long-press */}
              <div
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate"
                lang={t('en', 'hil')}
                title={t(k.en, k.hil)}
              >
                {t(k.en, k.hil)}
              </div>
            </div>
          </div>

          {/* Value: text-xl on mobile, text-2xl on sm+ */}
          <div className={`tabular text-xl sm:text-2xl font-extrabold ${k.color} leading-none`}>
            {k.value}{k.unit ?? ''}
          </div>

          {/* Sub-label with title fallback */}
          <div
            className="text-[10px] text-zinc-400 mt-1 truncate"
            title={t(k.subEn, k.subHil)}
          >
            {t(k.subEn, k.subHil)}
          </div>
        </div>
      ))}
    </div>
  )
}
