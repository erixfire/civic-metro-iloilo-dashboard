import { CSWDO_SERVICES } from '../data/mockData'

export default function CswdoServices() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        🏛️ CSWDO Services
      </h2>
      <pre className="text-xs text-zinc-500 whitespace-pre-wrap">{JSON.stringify(CSWDO_SERVICES, null, 2)}</pre>
    </div>
  )
}
