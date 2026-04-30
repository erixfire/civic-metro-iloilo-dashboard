import { useState } from 'react'
import { CSWDO_SERVICES } from '../data/mockData'

export default function CswdoServices() {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm h-full">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        🏛️ CSWDO Services
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CSWDO_SERVICES.map((s) => {
          const isOpen = expanded === s.id
          return (
            <div
              key={s.id}
              className="rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 p-3 hover:border-brand-500/40 transition-colors"
            >
              {/* Header row */}
              <button
                aria-expanded={isOpen}
                aria-controls={`cswdo-details-${s.id}`}
                onClick={() => setExpanded(isOpen ? null : s.id)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl mt-0.5" aria-hidden="true">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 leading-tight">
                      {s.name}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{s.desc}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-medium">
                        {s.status}
                      </span>
                      <span className="text-xs text-zinc-400">{s.hours}</span>
                    </div>
                  </div>
                  <span className="text-zinc-400 text-xs mt-1 shrink-0">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expandable requirements + contact */}
              {isOpen && (
                <div
                  id={`cswdo-details-${s.id}`}
                  className="mt-3 pt-3 border-t border-black/5 dark:border-white/5"
                >
                  {s.requirements?.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                        📋 Requirements
                      </p>
                      <ul className="space-y-1 mb-3">
                        {s.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                            <span className="text-brand-500 mt-0.5 shrink-0">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {s.contact && (
                    <a
                      href={`tel:${s.contact.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                      aria-label={`Call ${s.name}: ${s.contact}`}
                    >
                      📞 {s.contact}
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Office info footer */}
      <div className="mt-4 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-xs text-brand-700 dark:text-brand-300">
        📍 CSWDO Main Office: Gen. Luna St., City Proper, Iloilo City
        <br />
        📞{' '}
        <a href="tel:033337-8405" className="hover:underline font-medium">(033) 337-8405</a>
        {' '}| Mon–Fri 8:00 AM – 5:00 PM
      </div>
    </div>
  )
}
