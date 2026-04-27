/**
 * AdminKitchenSites — Add, edit, and activate/deactivate kitchen sites
 */
import { useState, useEffect } from 'react'

const DISTRICTS = ['City Proper','Arevalo','Jaro','La Paz','Lapuz','Mandurriao','Molo','Rizal']

export default function AdminKitchenSites() {
  const [sites,   setSites]   = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [form, setForm] = useState({
    name: '', barangay: '', district: 'Jaro',
    address: '', capacity: '', contact_person: '', contact_no: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/kitchen-sites')
      const d = await r.json()
      setSites(d.sites ?? [])
    } finally { setLoading(false) }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name || !form.barangay) return
    setSaving(true)
    try {
      await fetch('/api/kitchen-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      setForm({ name: '', barangay: '', district: 'Jaro', address: '', capacity: '', contact_person: '', contact_no: '' })
      load()
    } finally { setSaving(false) }
  }

  async function toggleActive(id, current) {
    await fetch('/api/kitchen-sites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: current ? 0 : 1 }),
    })
    load()
  }

  return (
    <div className="space-y-5">

      {/* Add site form */}
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-2">
            <label className="label">Site Name *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Jaro Community Kitchen" className="input-field" />
          </div>
          <div>
            <label className="label">District</label>
            <select value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} className="input-field">
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Barangay *</label>
            <input required value={form.barangay} onChange={(e) => setForm((f) => ({ ...f, barangay: e.target.value }))}
              placeholder="Brgy. San Isidro" className="input-field" />
          </div>
          <div className="col-span-2">
            <label className="label">Full Address</label>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Purok 3, Brgy. San Isidro, Jaro, Iloilo City" className="input-field" />
          </div>
          <div>
            <label className="label">Capacity (families)</label>
            <input type="number" min="1" value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              placeholder="150" className="input-field" />
          </div>
          <div>
            <label className="label">Contact Person</label>
            <input value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
              placeholder="Juan Dela Cruz" className="input-field" />
          </div>
          <div>
            <label className="label">Contact No.</label>
            <input value={form.contact_no} onChange={(e) => setForm((f) => ({ ...f, contact_no: e.target.value }))}
              placeholder="0917-xxx-xxxx" className="input-field" />
          </div>
        </div>
        {saved && <div className="text-xs text-green-600">✅ Kitchen site added!</div>}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : '🍲 Add Kitchen Site to D1'}
        </button>
      </form>

      {/* Sites table */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {loading && <div className="text-xs text-zinc-400 animate-pulse">Loading sites…</div>}
        {!loading && sites.length === 0 && (
          <div className="text-xs text-zinc-400 text-center py-6">
            No kitchen sites in D1 yet.
            <div className="mt-1 opacity-70">Run the kitchen_sites schema first — see db/admin_schema.sql</div>
          </div>
        )}
        {sites.map((s) => (
          <div key={s.id}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-black/5 dark:border-white/5 transition-opacity ${
              s.is_active ? 'bg-zinc-50 dark:bg-zinc-800' : 'bg-zinc-100/50 dark:bg-zinc-900 opacity-50'
            }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{s.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  s.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                }`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {s.barangay}{s.district ? ` · ${s.district}` : ''}
                {s.capacity ? ` · cap: ${s.capacity}` : ''}
                {s.contact_person ? ` · ${s.contact_person}` : ''}
              </div>
            </div>
            <button onClick={() => toggleActive(s.id, s.is_active)}
              className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                s.is_active
                  ? 'border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}>
              {s.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
