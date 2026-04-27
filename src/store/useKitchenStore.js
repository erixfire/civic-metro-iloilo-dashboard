/**
 * useKitchenStore — Zustand store for Community Kitchen Feeding Program.
 * Stores the active feeding log. In Tier 4, replaced by D1-backed API.
 * Operators can add daily log entries from the dashboard.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FEEDING_DAILY_LOG, FEEDING_BY_SITE_TODAY } from '../data/communityKitchenConfig'

const useKitchenStore = create(
  persist(
    (set, get) => ({
      feedingLog: FEEDING_DAILY_LOG,
      siteBreakdown: FEEDING_BY_SITE_TODAY,

      // Add a new daily log entry (operator-submitted)
      addFeedingEntry: (entry) =>
        set((s) => ({
          feedingLog: [
            ...s.feedingLog,
            {
              date:        entry.date,
              families:    Number(entry.families),
              individuals: Number(entry.individuals),
              sites:       Number(entry.sites),
              meals:       entry.meals,
            },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      // Get last N days
      getRecentLog: (days = 14) => {
        const log = get().feedingLog
        return log.slice(-days)
      },

      // Cumulative totals
      getTotals: () => {
        const log = get().feedingLog
        return log.reduce(
          (acc, d) => ({ families: acc.families + d.families, individuals: acc.individuals + d.individuals }),
          { families: 0, individuals: 0 },
        )
      },

      // Today's entry (last in log)
      getToday: () => {
        const log = get().feedingLog
        return log[log.length - 1] ?? null
      },
    }),
    {
      name: 'civic-iloilo-kitchen',
      partialize: (s) => ({ feedingLog: s.feedingLog, siteBreakdown: s.siteBreakdown }),
    },
  ),
)

export default useKitchenStore
