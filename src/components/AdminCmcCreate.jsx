/**
 * AdminCmcCreate — Create new CMC meeting + add action items inline
 * Fix: Authorization header now passed on all POST requests via getToken prop.
 * Mayor updated to Raisa P. Treñas.
 * UI: Stack meeting details vertically on small screens, textarea for agenda + task.
 */
import { useState } from 'react'
import useCmcStore from '../store/useCmcStore'

const DEPARTMENTS = [
  'CDRRMO','BFP','ICPO','CSWDO','ENRO','OBO',
  'PIO','DILG','DASMO','MIWD','MORE Power','POSMO',
]

const DEFAULT_VENUE    = 'CMO Conference Room, City Hall'
const DEFAULT_PRESIDED = 'Mayor Raisa P. Treñas'

export default function AdminCmcCreate({ onSuccess, getToken }) {
  const { fetchMeetings } = useCmcStore()
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const [form, setForm] = useState({
    meeting_no:   '',
    scheduled_at: '',
    venue:        DEFAULT_VENUE,
    presided_by:  DEFAULT_PRESIDED,
    agendaItems:  [''],
  })

  const [actionItems, setActionItems] = useState([
    { task: '', assigned_to: 'CDRRMO', due_date: '' },
  ])

  function authHeader() {
    const t = getToken?.()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  function setField(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  function setAgenda(i, val) {
    setForm((f) => {
      const a = [...f.agendaItems]
      a[i] = val
      return { ...f, agendaItems: a }
    })
  }
  function addAgenda()     { setForm((f) => ({ ...f, agendaItems: [...f.agendaItems, ''] })) }
  function removeAgenda(i) { setForm((f) => ({ ...f, agendaItems: f.agendaItems.filter((_, idx) => idx !== i) })) }

  function setAI(i, key, val) {
    setActionItems((items) => items.map((it, idx) => idx === i ? { ...it, [key]: val } : it))
  }
  function addAI()     { setActionItems((items) => [...items, { task: '', assigned_to: 'CDRRMO', due_date: '' }]) }
  function removeAI(i) { setActionItems((items) => items.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.meeting_no || !form.scheduled_at) return setError('Meeting number and date/time are required.')
    setSaving(true)
    try {
      const meetRes = await fetch('/api/cmc', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          type:         'meeting',
          meeting_no:   parseInt(form.meeting_no),
          scheduled_at: form.scheduled_at,
          venue:        form.venue,
          presided_by:  form.presided_by,
          agenda:       form.agendaItems.filter(Boolean),
        }),
      })
      const meetData = await meetRes.json()
      if (!meetData.ok) throw new Error(meetData.error ?? 'Meeting creation failed')
      const meetingId = meetData.id

      const validAI = actionItems.filter((a) => a.task.trim())
      for (const ai of validAI) {
        await fetch('/api/cmc', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({
            type:        'action_item',
            meeting_id:  meetingId,
            task:        ai.task,
            assigned_to: ai.assigned_to,
            due_date:    ai.due_date || null,
          }),
        })
      }

      await fetchMeetings()
      setSaved(true)
      setTimeout(() => { setSaved(false); onSuccess?.(meetingId) }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setForm({ meeting_no: '', scheduled_at: '', venue: DEFAULT_VENUE, presided_by: DEFAULT_PRESIDED, agendaItems: [''] })
    setActionItems([{ task: '', assigned_to: 'CDRRMO', due_date: '' }])
    setError('')
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100">🏛️ New CMC Meeting</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Crisis Management Committee · Iloilo City Government</p>
        </div>
        <button type="button" onClick={resetForm}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 transition-colors shrink-0">
          ↺ Reset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Meeting Details ─────────────────────────────── */}
        <fieldset className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-4">
          <legend className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Meeting Details</legend>

          {/* Row 1: Meeting # | Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Meeting # <span className="text-red-400">*</span></label>
              <input
                type="number" min="1" required
                value={form.meeting_no}
                onChange={(e) => setField('meeting_no', e.target.value)}
                placeholder="e.g. 6"
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Date &amp; Time <span className="text-red-400">*</span></label>
              <input
                type="datetime-local" required
                value={form.scheduled_at}
                onChange={(e) => setField('scheduled_at', e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Row 2: Presided By | Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Presided By</label>
              <input
                value={form.presided_by}
                onChange={(e) => setField('presided_by', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Venue</label>
              <input
                value={form.venue}
                onChange={(e) => setField('venue', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </fieldset>

        {/* ── Section 2: Agenda Items ────────────────────────────────── */}
        <fieldset className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
          <legend className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Agenda Items</legend>
          <div className="space-y-3">
            {form.agendaItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs text-zinc-400 w-5 shrink-0 text-right mt-2.5">{i + 1}.</span>
                <textarea
                  rows={2}
                  value={item}
                  onChange={(e) => setAgenda(i, e.target.value)}
                  placeholder={`Agenda item ${i + 1}`}
                  className="input-field resize-y min-h-[60px]"
                />
                {form.agendaItems.length > 1 && (
                  <button
                    type="button" onClick={() => removeAgenda(i)}
                    className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 text-lg mt-1"
                    aria-label={`Remove agenda item ${i + 1}`}
                  >×</button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button" onClick={addAgenda}
            className="text-xs text-[#01696f] hover:text-[#015459] font-semibold flex items-center gap-1 mt-1"
          >
            + Add agenda item
          </button>
        </fieldset>

        {/* ── Section 3: Pre-load Action Items ───────────────────────── */}
        <fieldset className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-4">
          <legend className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Pre-load Action Items <span className="normal-case font-normal">(optional)</span></legend>

          <div className="space-y-4">
            {actionItems.map((ai, i) => (
              <div key={i} className="rounded-lg border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800/40 p-3 space-y-3">

                {/* Task — full-width textarea */}
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {i === 0 && <div className="text-[10px] text-zinc-400 mb-1">Task</div>}
                    <textarea
                      rows={2}
                      value={ai.task}
                      onChange={(e) => setAI(i, 'task', e.target.value)}
                      placeholder="Task description"
                      className="input-field resize-y min-h-[60px]"
                    />
                  </div>
                  <button
                    type="button" onClick={() => removeAI(i)}
                    className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-lg shrink-0 mt-5"
                    aria-label={`Remove action item ${i + 1}`}
                  >×</button>
                </div>

                {/* Assigned to + Due date — side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    {i === 0 && <div className="text-[10px] text-zinc-400 mb-1">Assigned to</div>}
                    <select
                      value={ai.assigned_to}
                      onChange={(e) => setAI(i, 'assigned_to', e.target.value)}
                      className="input-field"
                    >
                      {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <div className="text-[10px] text-zinc-400 mb-1">Due date</div>}
                    <input
                      type="date"
                      value={ai.due_date}
                      onChange={(e) => setAI(i, 'due_date', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>

          <button
            type="button" onClick={addAI}
            className="text-xs text-[#01696f] hover:text-[#015459] font-semibold flex items-center gap-1"
          >
            + Add task
          </button>
        </fieldset>

        {/* Errors / success */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
            <span>⚠️</span> {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
            <span>✅</span> Meeting created! Redirecting to CMC Board…
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || saved}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {saving
              ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Creating…</>
              : '🏛️ Create CMC Meeting'
            }
          </button>
          {!saving && !saved && (
            <span className="text-[11px] text-zinc-400">Fields marked with * are required</span>
          )}
        </div>

      </form>
    </div>
  )
}
