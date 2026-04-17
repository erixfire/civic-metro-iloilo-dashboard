import { ILOILO_FUEL } from '../data/iloiloFuelConfig'
import { useFuelWatch } from '../hooks/useFuelWatch'

function formatPrice(value) {
  if (value == null || Number.isNaN(value)) return 'N/A'
  return `₱${value.toFixed(2)}`
}

export default function FuelWatchCard() {
  const { data, loading, error } = useFuelWatch()

  const ph = data?.philippines?.gasoline ?? null
  const iloiloGas = ILOILO_FUEL.gasoline?.avg ?? null
  const delta = iloiloGas != null && ph != null ? iloiloGas - ph : null

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
          Failed to load national benchmark. Iloilo values are operator-maintained.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-400 mb-0.5">Iloilo Avg — Gasoline</div>
            <div className="tabular text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              {formatPrice(iloiloGas)}
              <span className="text-base font-normal text-zinc-500">/L</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              As of {ILOILO_FUEL.asOf} — manual LPCC/DOE monitoring
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-400 mb-0.5">Philippines Avg (Gasoline)</div>
            <div className="tabular text-xl font-semibold text-zinc-700 dark:text-zinc-200">
              {formatPrice(ph)}
              <span className="text-sm font-normal text-zinc-500">/L</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              DOE-based national benchmark
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
          <FuelMiniCard label="Gasoline" data={ILOILO_FUEL.gasoline} />
          <FuelMiniCard label="Diesel" data={ILOILO_FUEL.diesel} />
          <FuelMiniCard label="Kerosene" data={ILOILO_FUEL.kerosene} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-zinc-400 mr-1">Spread vs PH (Gasoline):</span>
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
          Iloilo data is edited via src/data/iloiloFuelConfig.js
        </div>
      </div>
    </div>
  )
}

function FuelMiniCard({ label, data }) {
  const avg = data?.avg ?? null
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-2.5 py-2">
      <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-300 mb-0.5">
        {label}
      </div>
      <div className="tabular text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        {formatPrice(avg)}
        <span className="text-[11px] font-normal text-zinc-500">/L</span>
      </div>
      <div className="text-[10px] text-zinc-400 mt-0.5">
        {data?.min && data?.max
          ? `${formatPrice(data.min)} – ${formatPrice(data.max)}`
          : 'No range set'}
      </div>
    </div>
  )
}
