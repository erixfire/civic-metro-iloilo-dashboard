/**
 * useKitchenStore — fetches live data from /api/kitchen-feeding (D1)
 * Falls back to communityKitchenConfig mock data if the API is unavailable.
 */
import { create } from 'zustand'
import { FEEDING_DAILY_LOG, FEEDING_BY_SITE_TODAY, KITCHEN_TARGETS } from '../data/communityKitchenConfig'

const useKitchenStore = create((set, get) => ({
  // State
  feedingLog:    FEEDING_DAILY_LOG,   // fallback until API loads
  siteBreakdown: FEEDING_BY_SITE_TODAY,
  program:       null,
  totals:        { families: 0, individuals: 0, total_days: 0 },
  loading:       false,
  error:         null,
  lastFetched:   null,

  // ── Fetch from D1 API ────────────────────────────────────────────────────
  fetchData: async (days = 14) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/kitchen-feeding?days=${days}`)
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()

      // Normalise log_date field (D1 uses log_date, config uses date)
      const log = (data.log ?? []).map((d) => ({
        ...d,
        date: d.log_date ?? d.date,
      }))

      // Normalise site breakdown (D1 uses site_name, config uses siteName)
      const sites = (data.siteBreakdown ?? []).map((s) => ({
        ...s,
        siteId:   s.site_id   ?? s.siteId,
        siteName: s.site_name ?? s.siteName,
      }))

      set({
        feedingLog:    log,
        siteBreakdown: sites,
        program:       data.program   ?? null,
        totals: {
          families:   data.totals?.total_families   ?? 0,
          individuals:data.totals?.total_individuals ?? 0,
          total_days: data.totals?.total_days        ?? 0,
        },
        loading:     false,
        lastFetched: new Date().toISOString(),
      })
    } catch (e) {
      // Keep mock data visible, just flag the error
      set({ loading: false, error: e.message })
    }
  },

  // ── POST new daily log entry to D1 ──────────────────────────────────────
  addFeedingEntry: async (entry) => {
    const program = get().program
    const programId = program?.id ?? 'prog-2026-heat'

    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/kitchen-feeding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id:   programId,
          log_date:     entry.date,
          families:     Number(entry.families),
          individuals:  Number(entry.individuals),
          sites_active: Number(entry.sites),
          meals:        entry.meals,
          logged_by:    entry.logged_by ?? 'CSWDO Operator',
        }),
      })
      if (!res.ok) throw new Error(`POST error ${res.status}`)
      // Refresh data after successful post
      await get().fetchData()
    } catch (e) {
      set({ loading: false, error: e.message })
    }
  },

  // ── Selectors (work on live or fallback data) ────────────────────────────
  getRecentLog: (days = 14) => {
    const log = get().feedingLog
    return log.slice(-days)
  },

  getTotals: () => {
    const t = get().totals
    // If API totals not yet loaded, compute from log
    if (t.families === 0 && t.individuals === 0) {
      return get().feedingLog.reduce(
        (acc, d) => ({ families: acc.families + d.families, individuals: acc.individuals + d.individuals }),
        { families: 0, individuals: 0 },
      )
    }
    return t
  },

  getToday: () => {
    const log = get().feedingLog
    return log[log.length - 1] ?? null
  },

  getTargets: () => {
    const p = get().program
    if (p) {
      return {
        dailyFamilyTarget:     p.daily_family_target,
        dailyIndividualTarget: p.daily_individual_target,
        programStartDate:      p.start_date,
        programEndDate:        p.end_date,
        programName:           p.program_name,
        fundingSource:         p.funding_source,
      }
    }
    return KITCHEN_TARGETS
  },
}))

export default useKitchenStore
