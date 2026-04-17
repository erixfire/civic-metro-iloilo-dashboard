import { KPI_STATS } from '../data/mockData'

export default function KpiBar() {
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
              {k.value}
              {k.unit}
            </div>
            <div
              className={`text-xs font-semibold ${
                k.deltaDir === 'up' ? 'text-red-400' : 'text-green-500'
              }`}
            >
              {k.delta}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
