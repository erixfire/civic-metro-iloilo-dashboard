import { KPI_STATS } from '../data/mockData'

export default function KpiBar() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <pre className="col-span-4 text-xs text-zinc-500 whitespace-pre-wrap">{JSON.stringify(KPI_STATS, null, 2)}</pre>
    </div>
  )
}
