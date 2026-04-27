import { useState } from 'react'
import { EMERGENCY_CONTACTS } from '../data/mockData'

const GROUP_ICONS = {
  'Police': '👮',
  'Fire':   '🚒',
  'Medical / Hospital': '🏥',
  'Disaster / CDRRMO': '🆘',
  'Utilities': '⚡',
}

export default function EmergencyDirectory() {
  const [expanded, setExpanded] = useState({ ec1: true })
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">🆘 Emergency Hotlines</h2>
        <p className="text-xs text-zinc-400">I-tap ang numero para tawgon · Tap number to call</p>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
        {EMERGENCY_CONTACTS.map((group) => {
          const icon = GROUP_ICONS[group.category] ?? '📞'
          return (
            <div key={group.id} className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">

              {/* Group header */}
              <button
                onClick={() => toggle(group.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="font-bold text-sm text-zinc-700 dark:text-zinc-200">{group.category}</span>
                </div>
                <span className="text-zinc-400 text-xs">{expanded[group.id] ? '▲' : '▼'}</span>
              </button>

              {/* Contacts */}
              {expanded[group.id] && (
                <div className="divide-y divide-black/5 dark:divide-white/5">
                  {group.contacts.map((c, i) => (
                    <div key={i} className="px-3 py-2.5 flex items-center justify-between gap-3">

                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">{c.name}</div>
                        {c.number2 && <div className="text-xs text-zinc-400">{c.number2}</div>}
                      </div>

                      {/* Big tap-to-call button */}
                      <a
                        href={`tel:${c.number.replace(/[^\d+]/g, '')}`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#01696f] hover:bg-[#015459] text-white font-bold text-sm transition-colors shrink-0 active:scale-95"
                      >
                        <span className="text-base">📞</span>
                        <span className="tabular">{c.number}</span>
                      </a>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-zinc-400 text-center mt-3">
        Para sa emergency, tawga dayon · For emergencies, call immediately
      </p>
    </div>
  )
}
