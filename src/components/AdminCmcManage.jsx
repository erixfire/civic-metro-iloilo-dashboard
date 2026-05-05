/**
 * AdminCmcManage — List all CMC meetings, change status, add action items inline.
 * Fix: Authorization header now passed on all POST/PATCH requests via getToken prop.
 */
import { useState, useEffect, useCallback } from 'react'

const STATUS_FLOW = {
  scheduled: { next: 'ongoing',   label: '▶ Start Meeting',   color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  ongoing:   { next: 'concluded', label: '✅ Conclude',        color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  concluded: { next: null,        label: null,                 color: 'text-zinc-400',  bg: 'bg-zinc-50 dark:bg-zinc-800 border-black/5 dark:border-white/5' },
}

const AI_STATUSES = ['pending','in-progress','completed','cancelled']

const AI_STATUS_COLOR = {
  pending:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled:     'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400',
}

export default function AdminCmcManage({ getToken }) {
  const [meetings, setMeetings]   = useState([])
  const [loading,  setLoading]    = useState(false)
  const [expanded, setExpanded]   = useState(null)
  const [detail,   setDetail]     = useState(null)
  const [toast,    setToast]      = useState({ msg: '', type: 'success' })

  const [aiForm,   setAiForm]   = useState({ task: '', assigned_to: 'CDRRMO', due_date: '', status: 'pending' })
  const [aiSaving, setAiSaving] = useState(false)

  function authHeader() {
    const t = getToken?.()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/cmc?type=meetings')
      const d = await r.json()
      setMeetings(d.meetings ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadMeetings() }, [loadMeetings])

  async function loadDetail(id) {
    const r = await fetch(`/api/cmc?type=meeting&id=${id}`)
    const d = await r.json()
    setDetail(d)
  }

  async function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); setDetail(null); return }
    setExpanded(id)
    await loadDetail(id)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000)
  }

  async function advanceStatus(meeting) {
    const next = STATUS_FLOW[meeting.status]?.next
    if (!next) return
    const res = await fetch('/api/cmc', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ type: 'meeting', id: meeting.id, status: next }),
    })
    const data = await res.json()
    if (!data.ok) { showToast(data.error ?? 'Failed to update status', 'error'); return }
    showToast(`✅ Meeting status → ${next}`)
    loadMeetings()
    if (expanded === meeting.id) loadDetail(meeting.id)
  }

  async function updateAiStatus(aiId, status) {
    await fetch('/api/cmc', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ type: 'action_item', id: aiId, status }),
    })
    loadDetail(expanded)
  }

  async function addActionItem(e) {
    e.preventDefault()
    if (!aiForm.task || !aiForm.assigned_to) return
    setAiSaving(true)
    try {
      const res = await fetch('/api/cmc', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ type: 'action_item', meeting_id: expanded, ...aiForm }),
      })
      const data = await res.json()
      if (!data.ok) { showToast(data.error ?? 'Failed to add item', 'error'); return }
      setAiForm({ task: '', assigned_to: 'CDRRMO', due_date: '', status: 'pending' })
      showToast('✅ Action item added')
      loadDetail(expanded)
    } finally { setAiSaving(false) }
  }

  const DEPT_OPTIONS = [
    'CDRRMO','BFP','ICPO','CSWDO','ENRO','OBO','PIO','DILG','DASMO','MIWD','MORE Power','POSMO',
  ]

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast.msg && (
        <div className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg border ${
          toast.type === 'error'
            ? 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'text-green-700 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} in D1</p>
        <button
          onClick={loadMeetings}
          disabled={loading}
          className="text-xs font-semibold text-zinc-400 hover:text-[#01696f] flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <span className={loading ? 'animate-spin inline-block' : ''}>↺</span> Refresh
        </button>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && meetings.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <div className="text-3xl mb-2">🏛️</div>
          <div className="text-sm font-medium">No CMC meetings yet</div>
          <div className="text-xs mt-1">Use the ➕ CMC Create tab to add one.</div>
        </div>
      )}

      {/* Meeting cards */}
      {meetings.map((m) => {
        const flow   = STATUS_FLOW[m.status] ?? STATUS_FLOW.concluded
        const isOpen = expanded === m.id

        return (
          <div key={m.id} className={`rounded-xl border transition-all ${flow.bg}`}>

            {/* Header row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
              onClick={() => toggleExpand(m.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">{m.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${flow.bg} ${flow.color}`}>
                    {m.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5 truncate">
                  {m.meeting_no && `#${m.meeting_no} · `}
                  {m.scheduled_at
                    ? new Date(m.scheduled_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                  {m.venue ? ` · ${m.venue}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {flow.next && (
                  <button
                    onClick={(e) => { e.stopPropagation(); advanceStatus(m) }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${flow.color} border-current hover:opacity-80`}
                  >
                    {flow.label}
                  </button>
                )}
                <span className="text-zinc-400 text-sm">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-black/5 dark:border-white/5 px-4 py-4 space-y-5">

                {/* Presided by */}
                {detail?.meeting?.presided_by && (
                  <div className="text-xs text-zinc-500">
                    Presided by <span className="font-semibold text-zinc-700 dark:text-zinc-200">{detail.meeting.presided_by}</span>
                  </div>
                )}

                {/* Agenda */}
                {detail?.meeting?.agenda && (() => {
                  let items = []
                  try { items = JSON.parse(detail.meeting.agenda) } catch(_) {}
                  return items.length > 0 ? (
                    <div>
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">📋 Agenda</div>
                      <ol className="list-decimal list-inside space-y-1">
                        {items.map((item, i) => (
                          <li key={i} className="text-xs text-zinc-600 dark:text-zinc-300">{item}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null
                })()}

                {/* Action items list */}
                <div>
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    ✅ Action Items ({detail?.actionItems?.length ?? 0})
                  </div>
                  {(!detail?.actionItems || detail.actionItems.length === 0) && (
                    <div className="text-xs text-zinc-400 italic">No action items yet.</div>
                  )}
                  <div className="space-y-2">
                    {(detail?.actionItems ?? []).map((ai) => (
                      <div key={ai.id} className="flex items-start gap-3 rounded-lg bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{ai.task}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {ai.assigned_to}
                            {ai.due_date ? ` · due ${ai.due_date}` : ''}
                          </div>
                        </div>
                        <select
                          value={ai.status}
                          onChange={(e) => updateAiStatus(ai.id, e.target.value)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${ AI_STATUS_COLOR[ai.status] ?? '' }`}
                        >
                          {AI_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add action item form */}
                <form onSubmit={addActionItem} className="space-y-2 pt-3 border-t border-black/5 dark:border-white/5">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">+ Add Action Item</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        required
                        value={aiForm.task}
                        onChange={(e) => setAiForm((f) => ({ ...f, task: e.target.value }))}
                        placeholder="Task description"
                        className="input-field text-xs"
                      />
                    </div>
                    <select
                      required
                      value={aiForm.assigned_to}
                      onChange={(e) => setAiForm((f) => ({ ...f, assigned_to: e.target.value }))}
                      className="input-field text-xs"
                    >
                      {DEPT_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <input
                      type="date"
                      value={aiForm.due_date}
                      onChange={(e) => setAiForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="input-field text-xs"
                    />
                    <select
                      value={aiForm.status}
                      onChange={(e) => setAiForm((f) => ({ ...f, status: e.target.value }))}
                      className="input-field text-xs"
                    >
                      {AI_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <button type="submit" disabled={aiSaving} className="btn-primary text-xs !py-2">
                      {aiSaving ? 'Saving…' : 'Add Item'}
                    </button>
                  </div>
                </form>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
