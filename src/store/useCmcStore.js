/**
 * useCmcStore — CMC Meeting Board state, backed by /api/cmc D1 endpoint
 */
import { create } from 'zustand'

const CMC_DEPARTMENTS = [
  'CDRRMO', 'BFP', 'ICPO', 'CSWDO', 'ENRO', 'OBO',
  'PIO', 'DILG', 'DASMO', 'MIWD', 'MORE Power', 'POSMO',
]

const useCmcStore = create((set, get) => ({
  meetings:    [],
  activeMeeting: null,   // full meeting object with actionItems + deptUpdates
  loading:     false,
  error:       null,
  departments: CMC_DEPARTMENTS,

  // ── Fetch all meetings list ────────────────────────────────────────────────
  fetchMeetings: async () => {
    set({ loading: true, error: null })
    try {
      const res  = await fetch('/api/cmc?type=meetings')
      const data = await res.json()
      set({ meetings: data.meetings ?? [], loading: false })
    } catch (e) {
      set({ loading: false, error: e.message })
    }
  },

  // ── Fetch single meeting with action items + dept updates ──────────────────
  fetchMeeting: async (id) => {
    set({ loading: true, error: null })
    try {
      const res  = await fetch(`/api/cmc?type=meeting&id=${id}`)
      const data = await res.json()
      set({ activeMeeting: data, loading: false })
    } catch (e) {
      set({ loading: false, error: e.message })
    }
  },

  // ── Update action item status ─────────────────────────────────────────────
  updateActionStatus: async (id, status) => {
    try {
      await fetch('/api/cmc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'action_item', id, status }),
      })
      // Optimistic update
      set((s) => ({
        activeMeeting: s.activeMeeting ? {
          ...s.activeMeeting,
          actionItems: s.activeMeeting.actionItems.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        } : null,
      }))
    } catch (e) {
      set({ error: e.message })
    }
  },

  // ── Submit dept update ─────────────────────────────────────────────────────
  submitDeptUpdate: async (meetingId, department, update_text, status_flag = 'normal') => {
    try {
      await fetch('/api/cmc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'dept_update', meeting_id: meetingId, department, update_text, status_flag }),
      })
      // Refresh active meeting
      await get().fetchMeeting(meetingId)
    } catch (e) {
      set({ error: e.message })
    }
  },

  // ── Selectors ─────────────────────────────────────────────────────────────
  nextMeeting: () => {
    const now = new Date().toISOString()
    return get().meetings.find((m) => m.scheduled_at >= now && m.status === 'scheduled') ?? null
  },
}))

export { CMC_DEPARTMENTS }
export default useCmcStore
