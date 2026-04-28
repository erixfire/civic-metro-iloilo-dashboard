/**
 * useIncidentStore — live D1-backed incident management.
 * Falls back to SAMPLE_INCIDENTS when API is unavailable (demo / staging).
 */
import { create } from 'zustand'

// ── Sample incidents for demo / API fallback ────────────────────────────────
const SAMPLE_INCIDENTS = [
  {
    id: 'inc-demo-001',
    type: 'flood',
    severity: 'high',
    status: 'active',
    district: 'La Paz',
    address: 'Dungon Creek, Brgy. Dungon B, La Paz',
    description: 'Floodwater reaching knee-level along Dungon Creek due to heavy overnight rainfall. Affecting approx. 45 households.',
    lat: 10.7115, lng: 122.5553,
    reportedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'CDRRMO Responder',
  },
  {
    id: 'inc-demo-002',
    type: 'fire',
    severity: 'high',
    status: 'active',
    district: 'Jaro',
    address: 'Brgy. Rizal, near Jaro Public Market, Iloilo City',
    description: 'Structure fire involving 3 residential units. BFP on scene. Road closure along Lopez Jaena St.',
    lat: 10.7265, lng: 122.5436,
    reportedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    reportedBy: 'BFP Iloilo City',
  },
  {
    id: 'inc-demo-003',
    type: 'traffic',
    severity: 'moderate',
    status: 'active',
    district: 'Mandurriao',
    address: 'Diversion Road near SM City Iloilo flyover',
    description: 'Major traffic bottleneck due to stalled truck blocking the outermost lane. CTMO officers deployed.',
    lat: 10.7202, lng: 122.5621,
    reportedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    reportedBy: 'CTMO Iloilo',
  },
  {
    id: 'inc-demo-004',
    type: 'medical',
    severity: 'high',
    status: 'active',
    district: 'City Proper',
    address: 'Muelle Loney St, City Proper, near Iloilo River',
    description: 'Heat stroke victim reported near Iloilo River esplanade. ICER ambulance dispatched. Victim conscious.',
    lat: 10.6946, lng: 122.5746,
    reportedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    reportedBy: 'ICER (Iloilo City Emergency Response)',
  },
  {
    id: 'inc-demo-005',
    type: 'power',
    severity: 'moderate',
    status: 'active',
    district: 'Arevalo',
    address: 'Brgy. Sta. Cruz, Arevalo — along Tanza-Arevalo Rd',
    description: 'Fallen power line blocking the road after strong winds. MORE Power crew en route. Area energized — do not approach.',
    lat: 10.6720, lng: 122.5520,
    reportedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    reportedBy: 'MORE Power Iloilo',
  },
  {
    id: 'inc-demo-006',
    type: 'flood',
    severity: 'moderate',
    status: 'active',
    district: 'Molo',
    address: 'Brgy. Bonifacio, near Molo Plaza overflow drain',
    description: 'Storm drain overflow causing ankle-level flooding along Brgy. Bonifacio side street. Passable but caution advised.',
    lat: 10.6882, lng: 122.5561,
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'Barangay Bonifacio LGU',
  },
  {
    id: 'inc-demo-007',
    type: 'landslide',
    severity: 'low',
    status: 'resolved',
    district: 'Mandurriao',
    address: 'Mohon Road embankment, near Mohon Bridge',
    description: 'Minor soil erosion on road embankment. Road shoulder partially affected. DPWH crew completed patching.',
    lat: 10.7210, lng: 122.5480,
    reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'DPWH Iloilo',
  },
  {
    id: 'inc-demo-008',
    type: 'crime',
    severity: 'moderate',
    status: 'active',
    district: 'La Paz',
    address: 'Brgy. Tabuc Suba, La Paz — near La Paz Public Market',
    description: 'Reported snatching incident near La Paz market perimeter. PNP Iloilo City Station patrol deployed to the area.',
    lat: 10.7160, lng: 122.5600,
    reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    reportedBy: 'PNP Iloilo City Station',
  },
  {
    id: 'inc-demo-009',
    type: 'medical',
    severity: 'low',
    status: 'resolved',
    district: 'Jaro',
    address: 'Brgy. San Vicente, Jaro, Iloilo City',
    description: 'Elderly resident collapsed due to heat exhaustion. Transported to WVMC. Condition stable.',
    lat: 10.7300, lng: 122.5500,
    reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'ICER',
  },
  {
    id: 'inc-demo-010',
    type: 'other',
    severity: 'low',
    status: 'active',
    district: 'City Proper',
    address: 'Q. Abeto St / Airport Road, near IATA terminal',
    description: 'Unauthorized street vendor obstruction near airport terminal entrance. CTMO and PNP coordinating.',
    lat: 10.6830, lng: 122.4950,
    reportedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'CTMO Iloilo',
  },
]

// ── Store ────────────────────────────────────────────────────────────────────
const useIncidentStore = create((set, get) => ({
  incidents:   SAMPLE_INCIDENTS, // pre-seeded for demo
  loading:     false,
  error:       null,
  lastFetched: null,

  fetchIncidents: async ({ status = 'all', district, type, days = 30 } = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams({ days })
      if (status && status !== 'all') params.set('status', status)
      if (district) params.set('district', district)
      if (type)     params.set('type', type)

      const res = await fetch(`/api/incidents?${params}`)
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const live = data.incidents ?? []
      // If API returns data, use it; otherwise keep sample data
      set({
        incidents: live.length > 0 ? live : SAMPLE_INCIDENTS,
        loading: false,
        lastFetched: new Date().toISOString(),
      })
    } catch {
      // API unavailable — keep sample data visible
      set({ loading: false, lastFetched: new Date().toISOString() })
    }
  },

  addIncident: async (incident) => {
    set({ loading: true, error: null })
    try {
      const id  = `inc-${Date.now()}`
      const res = await fetch('/api/incidents', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...incident }),
      })
      if (!res.ok) throw new Error(`POST ${res.status}`)
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

  activeIncidents: () => get().incidents.filter((i) => i.status === 'active'),
}))

export default useIncidentStore
