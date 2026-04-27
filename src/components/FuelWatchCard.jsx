import { useFuelPrices } from '../hooks/useFuelPrices'
import { useFuelWatch }  from '../hooks/useFuelWatch'

function fmt(v) {
  if (v == null || Number.isNaN(v)) return 'N/A'
  return `₱${Number(v).toFixed(2)}`
}

export default function FuelWatchCard() {
  const { prices, loading, fromD1, lastFetched, refetch } = useFuelPrices()
  const { data: watchData } = useFuelWatch()

  // Prefer D1 PH benchmark; fall back to fuel-watch API
  const phGas = prices?.phGasoline ?? watchData?.philippines?.gasoline ?? null

  const iloiloGas = prices?.gasoline?.avg ?? null
  const delta     = iloiloGas != null && phGas != null ? iloiloGas - phGas : null

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            ⛽ Fuel Watch — Iloilo City
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${ fromD1 ? 'bg-green-500' : 'bg-zinc-400' }`} />
            <span className="text-[10px] text-zinc-400">
              {fromD1 ? 'Live · D1' : 'Static config'}
              {lastFetched && ` · ${new Date(lastFetched).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            <button onClick={refetch} className="text-[10px] text-zinc-400 hover:text-[#01696f]">↻</button>
          </div>
        </div>
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
      </div>

      {/* Main price display */}
      {prices && (
        <>
          <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-zinc-400 mb-0.5">Iloilo Avg — Gasoline</div>
                <div className="tabular text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                  {fmt(iloiloGas)}
                  <span className="text-base font-normal text-zinc-500">/L</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  As of {prices.asOf} · {fromD1 ? 'LPCC/DOE via D1' : 'static config'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400 mb-0.5">Philippines Avg (Gasoline)</div>
                <div className="tabular text-xl font-semibold text-zinc-700 dark:text-zinc-200">
                  {fmt(phGas)}
                  <span className="text-sm font-normal text-zinc-500">/L</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">DOE national benchmark</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <FuelMiniCard label="Gasoline" data={prices.gasoline} />
              <FuelMiniCard label="Diesel"   data={prices.diesel}   />
              <FuelMiniCard label="Kerosene" data={prices.kerosene} />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400 mr-1">Spread vs PH (Gasoline):</span>
              {delta != null ? (
                <span className={`tabular font-semibold ${ delta > 0 ? 'text-red-500' : delta < 0 ? 'text-green-500' : 'text-zinc-500' }`}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)} /L
                </span>
              ) : <span className="text-zinc-400">N/A</span>}
            </div>
            <div className="text-[11px] text-zinc-400">
              {fromD1 ? 'Source: Admin → D1' : 'Edit: src/data/iloiloFuelConfig.js'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FuelMiniCard({ label, data }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 px-2.5 py-2">
      <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-300 mb-0.5">{label}</div>
      <div className="tabular text-sm font-semibold text-zinc-800 dark:text-zinc-100">
        {data?.avg != null ? `₱${Number(data.avg).toFixed(2)}` : 'N/A'}
        <span className="text-[11px] font-normal text-zinc-500">/L</span>
      </div>
      <div className="text-[10px] text-zinc-400 mt-0.5">
        {data?.min != null && data?.max != null
          ? `₱${Number(data.min).toFixed(2)} – ₱${Number(data.max).toFixed(2)}`
          : 'No range'}
      </div>
    </div>
  )
}
