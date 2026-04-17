import { useState } from 'react'
import { EMERGENCY_CONTACTS } from '../data/mockData'

export default function EmergencyDirectory() {
  const [expanded, setExpanded] = useState({ ec1: true })
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        📞 Emergency Directory
      </h2>
      <div className="space-y-2 overflow-y-auto max-h-[400px] scrollbar-thin pr-1">
        {EMERGENCY_CONTACTS.map((group) => (
          <div
            key={group.id}
            className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden"
          >
            <button
              onClick={() => toggle(group.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-200">
                {group.category}
              </span>
              <span className="text-zinc-400 text-sm">
                {expanded[group.id] ? '▲' : '▼'}
              </span>
            </button>
            {expanded[group.id] && (
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {group.contacts.map((c, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {c.name}
                      </div>
                      {c.number2 && (
                        <div className="text-xs text-zinc-400">{c.number2}</div>
                      )}
                    </div>
                    <a
                      href={`tel:${c.number.replace(/[^\d+]/g, '')}`}
                      className="tabular text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
                    >
                      {c.number}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
