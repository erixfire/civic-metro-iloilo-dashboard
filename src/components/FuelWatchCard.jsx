import { useFuelWatch } from '../hooks/useFuelWatch'

function formatPrice(value) {
  if (value == null || Number.isNaN(value)) return 'N/A'
  return `₱${value.toFixed(2)}`
}

export default function FuelWatchCard() {
  const { data, loading, error } = useFuelWatch()

  const iloilo = data?.iloilo?.gasoline ?? null
  const ph = data?.philippines?.gasoline ?? null
  const delta = iloilo != null && ph != null ? iloilo - ph : null

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          ⛽ Fuel Watch — Iloilo City
        </h2>
        {loading && (
          <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-500 mb-2">
          Failed to load fuel data. Showing last known values if available.
        </div>
      )}

      <div className="flex items-end gap-4 mb-4">
        <div>
          <div className="text-xs text-zinc-400 mb-0.5">Iloilo Avg (Unleaded)</div>
          <div className="tabular text-3xl font-bold text-zinc-800 dark:text-zinc-100">
            {formatPrice(iloilo)}
            <span className="text-base font-normal text-zinc-500">/L</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Source: Numbeo — Gasoline (1 Liter) in Iloilo
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-zinc-400 mb-0.5">Philippines Avg</div>
          <div className="tabular text-xl font-semibold text-zinc-700 dark:text-zinc-200">
            {formatPrice(ph)}
            <span className="text-sm font-normal text-zinc-500">/L</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            DOE-based national average (GlobalPetrolPrices)
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-zinc-400 mr-1">Spread vs PH:</span>
          {delta != null ? (
            <span
              className={`tabular font-semibold ${
                delta > 0 ? 'text-red-500' : delta < 0 ? 'text-green-500' : 'text-zinc-500'
              }`}
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(2)} /L
            </span>
          ) : (
            <span className="text-zinc-400">N/A</span>
          )}
        </div>
        <div className="text-[11px] text-zinc-400">
          Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString('en-PH') : 'N/A'}
        </div>
      </div>
    </div>
  )
}
