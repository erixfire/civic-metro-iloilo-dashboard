/**
 * AdminCmcCreate — Create new CMC meeting + add action items inline
 */
import { useState } from 'react'
import useCmcStore from '../store/useCmcStore'

const DEPARTMENTS = [
  'CDRRMO','BFP','ICPO','CSWDO','ENRO','OBO',
  'PIO','DILG','DASMO','MIWD','MORE Power','POSMO',
]

export default function AdminCmcCreate({ onSuccess }) {
  const { fetchMeetings } = useCmcStore()
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const [form, setForm] = useState({
    meeting_no:  '',
    scheduled_at: '',
    venue: 'CMO Conference Room, City Hall',
    presided_by: 'Mayor Jerry P. Treñas',
    agendaItems: [''],
  })

  const [actionItems, setActionItems] = useState([
    { task: '', assigned_to: 'CDRRMO', due_date: '' },
  ])

  function setField(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  function setAgenda(i, val) {
    setForm((f) => {
      const a = [...f.agendaItems]
      a[i] = val
      return { ...f, agendaItems: a }
    })
  }

  function addAgenda()   { setForm((f) => ({ ...f, agendaItems: [...f.agendaItems, ''] })) }
  function removeAgenda(i) {
    setForm((f) => ({ ...f, agendaItems: f.agendaItems.filter((_, idx) => idx !== i) }))
  }

  function setAI(i, key, val) {
    setActionItems((items) => items.map((it, idx) => idx === i ? { ...it, [key]: val } : it))
  }
  function addAI()    { setActionItems((items) => [...items, { task: '', assigned_to: 'CDRRMO', due_date: '' }]) }
  function removeAI(i) { setActionItems((items) => items.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.meeting_no || !form.scheduled_at) return setError('Meeting number and date/time are required.')
    setSaving(true)
    try {
      // 1. Create meeting
      const meetRes = await fetch('/api/cmc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'meeting',
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

      // 2. Create action items
      const validAI = actionItems.filter((a) => a.task.trim())
      for (const ai of validAI) {
        await fetch('/api/cmc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'action_item',
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
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Meeting details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">Meeting #</label>
          <input type="number" min="1" required value={form.meeting_no}
            onChange={(e) => setField('meeting_no', e.target.value)}
            placeholder="6" className="input-field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Date & Time</label>
          <input type="datetime-local" required value={form.scheduled_at}
            onChange={(e) => setField('scheduled_at', e.target.value)}
            className="input-field" />
        </div>
        <div>
          <label className="label">Presided By</label>
          <input value={form.presided_by} onChange={(e) => setField('presided_by', e.target.value)}
            className="input-field" />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className="label">Venue</label>
          <input value={form.venue} onChange={(e) => setField('venue', e.target.value)}
            className="input-field" />
        </div>
      </div>

      {/* Agenda */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Agenda Items</label>
          <button type="button" onClick={addAgenda}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold">+ Add item</button>
        </div>
        <div className="space-y-1.5">
          {form.agendaItems.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-xs text-zinc-400 w-5 pt-2 shrink-0">{i + 1}.</span>
              <input value={item} onChange={(e) => setAgenda(i, e.target.value)}
                placeholder={`Agenda item ${i + 1}`} className="input-field" />
              {form.agendaItems.length > 1 && (
                <button type="button" onClick={() => removeAgenda(i)}
                  className="text-zinc-400 hover:text-red-500 text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Pre-load Action Items</label>
          <button type="button" onClick={addAI}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold">+ Add task</button>
        </div>
        <div className="space-y-2">
          {actionItems.map((ai, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <input value={ai.task} onChange={(e) => setAI(i, 'task', e.target.value)}
                  placeholder="Task description" className="input-field" />
              </div>
              <div className="col-span-4">
                <select value={ai.assigned_to} onChange={(e) => setAI(i, 'assigned_to', e.target.value)}
                  className="input-field">
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="date" value={ai.due_date} onChange={(e) => setAI(i, 'due_date', e.target.value)}
                  className="input-field" />
              </div>
              <button type="button" onClick={() => removeAI(i)}
                className="text-zinc-400 hover:text-red-500 text-xl leading-none pt-1">×</button>
            </div>
          ))}
        </div>
      </div>

      {error  && <div className="text-xs text-red-500">{error}</div>}
      {saved  && <div className="text-xs text-green-600">✅ Meeting created successfully!</div>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Creating meeting…' : '🏛️ Create CMC Meeting'}
      </button>
    </form>
  )
}
