/**
 * AdminCmcManage — List all CMC meetings, change status, add action items inline
 */
import { useState, useEffect, useCallback } from 'react'

const STATUS_FLOW = {
  scheduled: { next: 'ongoing',   label: '▶ Start Meeting',   color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  ongoing:   { next: 'concluded', label: '✅ Conclude',        color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  concluded: { next: null,        label: null,                 color: 'text-zinc-400',  bg: 'bg-zinc-50 dark:bg-zinc-800 border-black/5 dark:border-white/5' },
}

const AI_STATUSES = ['pending','in-progress','completed','cancelled']

export default function AdminCmcManage() {
  const [meetings, setMeetings]   = useState([])
  const [loading,  setLoading]    = useState(false)
  const [expanded, setExpanded]   = useState(null)   // meeting id currently open
  const [detail,   setDetail]     = useState(null)   // { meeting, actionItems }
  const [toast,    setToast]      = useState('')

  // New action item form
  const [aiForm, setAiForm] = useState({ task: '', assigned_to: '', due_date: '', status: 'pending' })
  const [aiSaving, setAiSaving] = useState(false)

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

  function showToast(msg) {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  async function advanceStatus(meeting) {
    const next = STATUS_FLOW[meeting.status]?.next
    if (!next) return
    await fetch('/api/cmc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'meeting', id: meeting.id, status: next }),
    })
    showToast(`✅ Meeting status → ${next}`)
    loadMeetings()
    if (expanded === meeting.id) loadDetail(meeting.id)
  }

  async function updateAiStatus(aiId, status) {
    await fetch('/api/cmc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'action_item', id: aiId, status }),
    })
    loadDetail(expanded)
  }

  async function addActionItem(e) {
    e.preventDefault()
    if (!aiForm.task || !aiForm.assigned_to) return
    setAiSaving(true)
    try {
      await fetch('/api/cmc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'action_item', meeting_id: expanded, ...aiForm }),
      })
      setAiForm({ task: '', assigned_to: '', due_date: '', status: 'pending' })
      showToast('✅ Action item added')
      loadDetail(expanded)
    } finally { setAiSaving(false) }
  }

  const AI_STATUS_COLOR = {
    pending:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    cancelled:   'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400',
  }

  return (
    <div className="space-y-3">
      {toast && <div className="text-xs font-semibold text-green-600">{toast}</div>}

      {loading && (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      )}

      {!loading && meetings.length === 0 && (
        <div className="text-xs text-zinc-400 text-center py-8">No CMC meetings in D1 yet.<br/>Use the Create tab to add one.</div>
      )}

      {meetings.map((m) => {
        const flow = STATUS_FLOW[m.status] ?? STATUS_FLOW.concluded
        const isOpen = expanded === m.id

        return (
          <div key={m.id} className={`rounded-xl border transition-all ${flow.bg}`}>

            {/* Meeting header row */}
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => toggleExpand(m.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{m.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${flow.bg} ${flow.color}`}>
                    {m.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
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
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${flow.color} border-current hover:opacity-80`}>
                    {flow.label}
                  </button>
                )}
                <span className="text-zinc-400 text-sm">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-black/5 dark:border-white/5 px-4 py-4 space-y-4">

                {/* Agenda */}
                {detail?.meeting?.agenda && (() => {
                  let items = []
                  try { items = JSON.parse(detail.meeting.agenda) } catch(_) {}
                  return items.length > 0 ? (
                    <div>
                      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Agenda</div>
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
                    Action Items ({detail?.actionItems?.length ?? 0})
                  </div>
                  {(!detail?.actionItems || detail.actionItems.length === 0) && (
                    <div className="text-xs text-zinc-400">No action items yet.</div>
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
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${ AI_STATUS_COLOR[ai.status] ?? '' }`}>
                          {AI_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add action item form */}
                <form onSubmit={addActionItem} className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">+ Add Action Item</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input required value={aiForm.task}
                        onChange={(e) => setAiForm((f) => ({ ...f, task: e.target.value }))}
                        placeholder="Task description" className="input-field text-xs" />
                    </div>
                    <input required value={aiForm.assigned_to}
                      onChange={(e) => setAiForm((f) => ({ ...f, assigned_to: e.target.value }))}
                      placeholder="Assigned to (dept/person)" className="input-field text-xs" />
                    <input type="date" value={aiForm.due_date}
                      onChange={(e) => setAiForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="input-field text-xs" />
                    <select value={aiForm.status}
                      onChange={(e) => setAiForm((f) => ({ ...f, status: e.target.value }))}
                      className="input-field text-xs">
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
