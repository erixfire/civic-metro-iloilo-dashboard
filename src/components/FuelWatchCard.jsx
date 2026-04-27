import { useFuelPrices } from '../hooks/useFuelPrices'

function fmt(v) {
  if (v == null || Number.isNaN(Number(v))) return 'N/A'
  return `₱${Number(v).toFixed(2)}`
}

function SpreadBadge({ iloilo, ph }) {
  if (iloilo == null || ph == null) return null
  const delta = iloilo - ph
  if (Math.abs(delta) < 0.01) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500">
      Same as national
    </span>
  )
  return delta < 0 ? (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
      ✅ Mas barato sang sa national ({fmt(Math.abs(delta))} cheaper)
    </span>
  ) : (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
      ⚠️ Mas mahal sang sa national ({fmt(delta)} higher)
    </span>
  )
}

function FuelRow({ icon, labelEn, labelHil, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-black/5 dark:border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{labelEn}</div>
          <div className="text-xs text-zinc-400">{labelHil}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="tabular text-xl font-bold text-zinc-800 dark:text-zinc-100">
          {value}
        </div>
        <div className="text-xs text-zinc-400">bawat litro</div>
      </div>
    </div>
  )
}

export default function FuelWatchCard() {
  const { prices, loading, fromD1, lastFetched, refetch } = useFuelPrices()

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">
            ⛽ Fuel Prices
          </h2>
          <p className="text-xs text-zinc-400">Presyo sang Gasolina sa Iloilo</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-400 animate-pulse">Nagkarga…</span>}
          <button onClick={refetch} title="Refresh" className="text-zinc-400 hover:text-[#01696f] text-sm transition-colors">↻</button>
        </div>
      </div>

      {/* Spread badge */}
      {prices && (
        <div className="mb-3">
          <SpreadBadge iloilo={prices.gasoline?.avg} ph={prices.phGasoline} />
        </div>
      )}

      {/* Fuel rows */}
      {prices ? (
        <div>
          <FuelRow icon="⛽" labelEn="Gasoline" labelHil="Gasolina" value={fmt(prices.gasoline?.avg)} />
          <FuelRow icon="🛢️" labelEn="Diesel" labelHil="Diesel" value={fmt(prices.diesel?.avg)} />
          <FuelRow icon="🕯️" labelEn="Kerosene" labelHil="Gaas" value={fmt(prices.kerosene?.avg)} />
        </div>
      ) : (
        <div className="py-6 text-center text-zinc-400 text-sm">Nagkarga ang presyo… / Loading prices…</div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          {prices?.asOf ? (
            <span>Petsa · As of <span className="font-medium text-zinc-500">{prices.asOf}</span></span>
          ) : null}
        </div>
        <div className="text-xs text-zinc-400">
          {fromD1 ? 'Gikan sa · LPCC / DOE' : 'Static config'}
        </div>
      </div>
    </div>
  )
}
