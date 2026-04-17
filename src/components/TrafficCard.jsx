import { TRAFFIC_STATUS, JEEPNEY_REROUTES, TRAFFIC_CHART_DATA } from '../data/mockData'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

export default function TrafficCard() {
  const textColor = '#6b7280'
  const gridColor = 'rgba(0,0,0,0.06)'

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: textColor, font: { size: 11 }, boxWidth: 12 },
      },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: {
        ticks: { color: textColor, font: { size: 10 } },
        grid: { color: gridColor },
      },
      y: {
        ticks: {
          color: textColor,
          font: { size: 10 },
          callback: (v) => v + '%',
        },
        grid: { color: gridColor },
        min: 0,
        max: 100,
      },
    },
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        🚦 Traffic & Transport
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
        {TRAFFIC_STATUS.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2"
          >
            <span className="text-base">{r.icon}</span>
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate">
                {r.road}
              </div>
              <div className="text-xs text-zinc-400 truncate">{r.note}</div>
            </div>
            <span
              className={`ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold text-white ${
                r.status === 'Heavy'
                  ? 'bg-red-500'
                  : r.status === 'Moderate'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Congestion Index (Today)
        </div>
        <div style={{ height: 160 }}>
          <Line data={TRAFFIC_CHART_DATA} options={chartOptions} />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          🚌 Jeepney Reroutes
        </div>
        <div className="space-y-2">
          {JEEPNEY_REROUTES.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2"
            >
              <span
                className={`mt-0.5 shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold text-white ${
                  r.status === 'Rerouted'
                    ? 'bg-orange-500'
                    : r.status === 'Suspended'
                    ? 'bg-red-500'
                    : 'bg-green-500'
                }`}
              >
                {r.status}
              </span>
              <div>
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                  {r.route}
                </div>
                <div className="text-xs text-zinc-400">{r.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
