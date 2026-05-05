import { useFuelPrices } from '../hooks/useFuelPrices'

function fmt(v) {
  if (v == null || Number.isNaN(Number(v))) return 'N/A'
  return `₱${Number(v).toFixed(2)}`
}

function fmtShort(v) {
  if (v == null || Number.isNaN(Number(v))) return null
  return `₱${Number(v).toFixed(2)}`
}

function SpreadBadge({ iloilo, ph }) {
  if (iloilo == null || ph == null) return null
  const delta = iloilo - ph
  if (Math.abs(delta) < 0.01)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500">
        Same as national
      </span>
    )
  return delta < 0 ? (
    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
      ↓ {fmt(Math.abs(delta))} vs national
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
      ↑ {fmt(delta)} vs national
    </span>
  )
}

function FuelRow({ icon, labelEn, labelHil, value, min, max, highlight }) {
  const minStr = fmtShort(min)
  const maxStr = fmtShort(max)
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-black/5 dark:border-white/5 last:border-0 ${
      highlight ? 'bg-[#01696f]/5 dark:bg-[#01696f]/10 -mx-4 px-4 rounded-lg' : ''
    }`}>
      {/* Left: icon + label */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 leading-tight truncate">
            {labelEn}
          </div>
          <div className="text-[10px] text-zinc-400 leading-tight">{labelHil}</div>
          {/* Min/max range pill — shown only when data is available */}
          {minStr && maxStr && (
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {minStr} – {maxStr}
            </div>
          )}
        </div>
      </div>

      {/* Right: price */}
      <div className="text-right shrink-0 ml-2">
        <div className="tabular-nums text-lg sm:text-xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
          {value}
        </div>
        <div className="text-[10px] text-zinc-400">common/L</div>
      </div>
    </div>
  )
}

export default function FuelWatchCard() {
  const { prices, loading, fromD1, lastFetched, refetch } = useFuelPrices()

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm h-full flex flex-col">

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
            ⛽ Fuel Prices
          </h2>
          <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">Iloilo City · DOE Common Price</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {loading && (
            <span className="text-[10px] text-zinc-400 animate-pulse">Loading…</span>
          )}
          <button
            onClick={refetch}
            title="Refresh"
            className="text-zinc-400 hover:text-[#01696f] text-base transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Spread badge row */}
      {prices && prices.phGasoline && (
        <div className="px-4 pb-2">
          <SpreadBadge iloilo={prices.gasoline?.avg} ph={prices.phGasoline} />
        </div>
      )}

      {/* Fuel rows */}
      <div className="px-4 flex-1">
        {prices ? (
          <>
            <FuelRow
              icon="⛽"
              labelEn="Gasoline (RON 95)"
              labelHil="Gasolina"
              value={fmt(prices.gasoline?.avg)}
              min={prices.gasoline?.min}
              max={prices.gasoline?.max}
              highlight
            />
            <FuelRow
              icon="🛢️"
              labelEn="Diesel"
              labelHil="Diesel"
              value={fmt(prices.diesel?.avg)}
              min={prices.diesel?.min}
              max={prices.diesel?.max}
            />
            <FuelRow
              icon="🕯️"
              labelEn="Kerosene"
              labelHil="Gaas"
              value={fmt(prices.kerosene?.avg)}
              min={prices.kerosene?.min}
              max={prices.kerosene?.max}
            />
          </>
        ) : (
          <div className="py-6 text-center text-zinc-400 text-xs">Loading prices…</div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 mt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
        <div className="text-[10px] text-zinc-400 truncate">
          {prices?.asOf
            ? <span>As of <span className="font-medium text-zinc-500">{prices.asOf}</span></span>
            : null
          }
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {fromD1 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium">
              DOE Live
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-medium">
              Static
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
