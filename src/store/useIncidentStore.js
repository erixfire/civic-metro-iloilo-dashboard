/**
 * useIncidentStore — manages CDRRMO-submitted incident report markers.
 * Incidents are stored in Zustand with localStorage persistence so they
 * survive page refreshes. In a future Tier 4 upgrade, sync to D1.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let _nextId = Date.now()
const newId = () => `inc-${_nextId++}`

const useIncidentStore = create(
  persist(
    (set, get) => ({
      incidents: [],

      addIncident: (incident) =>
        set((s) => ({
          incidents: [
            {
              id: newId(),
              reportedAt: new Date().toISOString(),
              status: 'active',
              ...incident,
            },
            ...s.incidents,
          ],
        })),

      resolveIncident: (id) =>
        set((s) => ({
          incidents: s.incidents.map((i) =>
            i.id === id ? { ...i, status: 'resolved', resolvedAt: new Date().toISOString() } : i,
          ),
        })),

      deleteIncident: (id) =>
        set((s) => ({ incidents: s.incidents.filter((i) => i.id !== id) })),

      activeIncidents: () => get().incidents.filter((i) => i.status === 'active'),
    }),
    {
      name: 'civic-iloilo-incidents',
      partialize: (s) => ({ incidents: s.incidents }),
    },
  ),
)

export default useIncidentStore
