/**
 * useIncidentStore — live D1-backed incident management.
 * All reads/writes go through /api/incidents (Cloudflare Function → D1).
 * Falls back to empty array if API is unavailable.
 */
import { create } from 'zustand'

const useIncidentStore = create((set, get) => ({
  incidents:   [],
  loading:     false,
  error:       null,
  lastFetched: null,

  // ── Fetch incidents from D1 ──────────────────────────────────────────────
  fetchIncidents: async ({ status = 'all', district, type, days = 30 } = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams({ days })
      if (status && status !== 'all') params.set('status', status)
      if (district) params.set('district', district)
      if (type)     params.set('type', type)

      const res = await fetch(`/api/incidents?${params}`)
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      set({ incidents: data.incidents ?? [], loading: false, lastFetched: new Date().toISOString() })
    } catch (e) {
      set({ loading: false, error: e.message })
    }
  },

  // ── Submit new incident → D1 ─────────────────────────────────────────────
  addIncident: async (incident) => {
    set({ loading: true, error: null })
    try {
      const id  = `inc-${Date.now()}`
      const res = await fetch('/api/incidents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...incident }),
      })
      if (!res.ok) throw new Error(`POST error ${res.status}`)
      // Optimistically add to local state
      set((s) => ({
        loading: false,
        incidents: [
          { id, reportedAt: new Date().toISOString(), status: 'active', ...incident },
          ...s.incidents,
        ],
      }))
      return id
    } catch (e) {
      set({ loading: false, error: e.message })
    }
  },

  // ── Resolve incident ─────────────────────────────────────────────────────
  resolveIncident: async (id) => {
    try {
      await fetch('/api/incidents', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'resolve' }),
      })
      set((s) => ({
        incidents: s.incidents.map((i) =>
          i.id === id ? { ...i, status: 'resolved', resolvedAt: new Date().toISOString() } : i
        ),
      }))
    } catch (e) {
      set({ error: e.message })
    }
  },

  // ── Delete incident ──────────────────────────────────────────────────────
  deleteIncident: async (id) => {
    try {
      await fetch('/api/incidents', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      })
      set((s) => ({ incidents: s.incidents.filter((i) => i.id !== id) }))
    } catch (e) {
      set({ error: e.message })
    }
  },

  // ── Selectors ────────────────────────────────────────────────────────────
  activeIncidents: () => get().incidents.filter((i) => i.status === 'active'),
}))

export default useIncidentStore
