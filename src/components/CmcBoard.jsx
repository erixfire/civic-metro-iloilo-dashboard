/**
 * CmcBoard — Crisis Management Council Meeting Board
 * Shows: upcoming meeting countdown, agenda, action items tracker,
 * department update submission cards.
 */
import { useEffect, useState } from 'react'
import useCmcStore, { CMC_DEPARTMENTS } from '../store/useCmcStore'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'in-progress':'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
  done:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  overdue:     'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400',
  scheduled:   'bg-zinc-100  text-zinc-600  dark:bg-zinc-800     dark:text-zinc-300',
  ongoing:     'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  concluded:   'bg-zinc-100  text-zinc-400  dark:bg-zinc-800     dark:text-zinc-500',
}

const FLAG_STYLES = {
  normal:   'border-l-4 border-green-400',
  advisory: 'border-l-4 border-yellow-400',
  critical: 'border-l-4 border-red-500',
}

function StatusPill({ status }) {
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
      STATUS_STYLES[status] ?? STATUS_STYLES.scheduled
    }`}>
      {status}
    </span>
  )
}

function Countdown({ target }) {
  const [diff, setDiff] = useState(0)
  useEffect(() => {
    const tick = () => setDiff(new Date(target) - Date.now())
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [target])

  if (diff <= 0) return <span className="text-brand-600 font-bold">Meeting is now / concluded</span>

  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000)  / 1000)

  return (
    <span className="tabular font-bold text-brand-600">
      {h > 0 && `${h}h `}{m}m {String(s).padStart(2,'0')}s
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CmcBoard() {
  const {
    meetings, activeMeeting, loading, error,
    fetchMeetings, fetchMeeting, updateActionStatus, submitDeptUpdate,
    nextMeeting,
  } = useCmcStore()

  const [selectedId, setSelectedId] = useState(null)
  const [deptForm, setDeptForm]     = useState({ dept: '', text: '', flag: 'normal' })
  const [deptSaved, setDeptSaved]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMeetings()
  }, [])

  useEffect(() => {
    if (meetings.length && !selectedId) {
      // Auto-select the latest / next scheduled meeting
      const next = nextMeeting()
      const id   = next?.id ?? meetings[0]?.id
      if (id) { setSelectedId(id); fetchMeeting(id) }
    }
  }, [meetings])

  function selectMeeting(id) {
    setSelectedId(id)
    fetchMeeting(id)
  }

  async function handleDeptSubmit(e) {
    e.preventDefault()
    if (!deptForm.dept || !deptForm.text) return
    setSubmitting(true)
    await submitDeptUpdate(selectedId, deptForm.dept, deptForm.text, deptForm.flag)
    setSubmitting(false)
    setDeptSaved(true)
    setDeptForm({ dept: '', text: '', flag: 'normal' })
    setTimeout(() => setDeptSaved(false), 3000)
  }

  const meeting    = activeMeeting?.meeting
  const items      = activeMeeting?.actionItems  ?? []
  const updates    = activeMeeting?.deptUpdates  ?? []
  const agenda     = meeting?.agenda ?? []

  const doneCount    = items.filter((i) => i.status === 'done').length
  const overdueCount = items.filter((i) => {
    if (i.status === 'done') return false
    if (!i.due_date) return false
    return new Date(i.due_date) < new Date()
  }).length

  return (
    <div className="space-y-5">

      {/* Meeting selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {meetings.map((m) => (
          <button
            key={m.id}
            onClick={() => selectMeeting(m.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              selectedId === m.id
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-black/10 dark:border-white/10 hover:border-brand-600'
            }`}
          >
            CMC #{m.meeting_no} &nbsp;<StatusPill status={m.status} />
          </button>
        ))}
        {loading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
      </div>

      {/* Meeting header card */}
      {meeting && (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">
                🏛️ {meeting.title}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {new Date(meeting.scheduled_at).toLocaleDateString('en-PH', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })} &nbsp;·&nbsp;
                {new Date(meeting.scheduled_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                &nbsp;·&nbsp; {meeting.venue}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">Presided by: {meeting.presided_by}</p>
            </div>
            <div className="text-right shrink-0">
              <StatusPill status={meeting.status} />
              {meeting.status === 'scheduled' && (
                <div className="text-xs text-zinc-400 mt-1">
                  Starts in: <Countdown target={meeting.scheduled_at} />
                </div>
              )}
            </div>
          </div>

          {/* Agenda */}
          {agenda.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">📋 Agenda</div>
              <ol className="space-y-1">
                {agenda.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300 flex gap-2">
                    <span className="text-brand-600 font-bold shrink-0">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Action Items Tracker */}
      {items.length > 0 && (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">✅ Action Items Tracker</div>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600 font-semibold">{doneCount} done</span>
              {overdueCount > 0 && <span className="text-red-500 font-semibold">{overdueCount} overdue</span>}
              <span className="text-zinc-400">{items.length} total</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mb-4 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-brand-600 transition-all"
              style={{ width: `${items.length ? Math.round((doneCount / items.length) * 100) : 0}%` }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5">
                  <th className="text-left py-1.5 text-zinc-400 font-medium w-6">#</th>
                  <th className="text-left py-1.5 text-zinc-400 font-medium">Task</th>
                  <th className="text-left py-1.5 text-zinc-400 font-medium">Assigned To</th>
                  <th className="text-left py-1.5 text-zinc-400 font-medium">Due</th>
                  <th className="text-left py-1.5 text-zinc-400 font-medium">Status</th>
                  <th className="text-left py-1.5 text-zinc-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const isOverdue = item.status !== 'done' && item.due_date && new Date(item.due_date) < new Date()
                  return (
                    <tr key={item.id} className={`border-b border-black/5 dark:border-white/5 ${
                      isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}>
                      <td className="py-2 text-zinc-400">{i + 1}</td>
                      <td className="py-2 text-zinc-700 dark:text-zinc-200 font-medium pr-4">{item.task}</td>
                      <td className="py-2">
                        <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                          {item.assigned_to}
                        </span>
                      </td>
                      <td className={`py-2 tabular ${ isOverdue ? 'text-red-500 font-semibold' : 'text-zinc-400' }`}>
                        {item.due_date ?? '—'}
                      </td>
                      <td className="py-2"><StatusPill status={isOverdue ? 'overdue' : item.status} /></td>
                      <td className="py-2">
                        {item.status !== 'done' && (
                          <button
                            onClick={() => updateActionStatus(item.id, 'done')}
                            className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold underline"
                          >
                            Mark done
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department Updates */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">📢 Department Situational Updates</div>

        {/* Submitted updates */}
        {updates.length > 0 && (
          <div className="space-y-2 mb-4">
            {updates.map((u) => (
              <div key={u.id} className={`rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs ${ FLAG_STYLES[u.status_flag] ?? FLAG_STYLES.normal }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-zinc-700 dark:text-zinc-200">{u.department}</span>
                  <span className={`text-[10px] uppercase font-semibold ${
                    u.status_flag === 'critical' ? 'text-red-500' :
                    u.status_flag === 'advisory' ? 'text-yellow-500' : 'text-green-600'
                  }`}>● {u.status_flag}</span>
                  <span className="ml-auto text-zinc-400">
                    {new Date(u.submitted_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{u.update_text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Departments still pending */}
        {(() => {
          const submitted = new Set(updates.map((u) => u.department))
          const pending   = CMC_DEPARTMENTS.filter((d) => !submitted.has(d))
          if (!pending.length) return (
            <div className="text-xs text-green-600 font-semibold">✅ All departments have submitted updates!</div>
          )
          return (
            <div className="mb-3">
              <div className="text-xs text-zinc-400 mb-1">Awaiting updates from:</div>
              <div className="flex flex-wrap gap-1.5">
                {pending.map((d) => (
                  <span key={d} className="text-[11px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">{d}</span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Submit form */}
        {selectedId && (
          <form onSubmit={handleDeptSubmit} className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Submit Department Update</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Department</label>
                <select value={deptForm.dept} onChange={(e) => setDeptForm((f) => ({ ...f, dept: e.target.value }))}
                  className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600">
                  <option value="">Select agency…</option>
                  {CMC_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Status Flag</label>
                <select value={deptForm.flag} onChange={(e) => setDeptForm((f) => ({ ...f, flag: e.target.value }))}
                  className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600">
                  <option value="normal">🟢 Normal</option>
                  <option value="advisory">🟡 Advisory</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Situational Update</label>
              <textarea
                rows={3}
                value={deptForm.text}
                onChange={(e) => setDeptForm((f) => ({ ...f, text: e.target.value }))}
                placeholder="Briefly describe current situation, actions taken, and any concerns…"
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
              />
            </div>
            {deptSaved && <div className="text-xs text-green-600">✅ Update submitted to D1!</div>}
            <button type="submit" disabled={submitting}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg py-2 transition-colors">
              {submitting ? 'Submitting…' : 'Submit Update'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
