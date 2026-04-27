import { useState } from 'react'
import useIncidentStore from '../store/useIncidentStore'

const INCIDENT_TYPES = [
  { value: 'flood',     label: '💧 Flood / Rising Water' },
  { value: 'fire',      label: '🔥 Fire' },
  { value: 'traffic',   label: '🚦 Traffic Accident / Obstruction' },
  { value: 'medical',   label: '🚑 Medical Emergency' },
  { value: 'power',     label: '⚡ Power Line / Electrical' },
  { value: 'landslide', label: '⛰️ Landslide / Ground Movement' },
  { value: 'crime',     label: '🚨 Crime / Security' },
  { value: 'other',     label: 'ℹ️ Other' },
]

const SEVERITY = [
  { value: 'low',      label: 'Low',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  { value: 'moderate', label: 'Moderate', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  { value: 'high',     label: 'High',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
]

// District centroid coordinates — incidents without a GPS pin
// will appear at the district center on the TrafficMap.
const DISTRICT_CENTROIDS = {
  'City Proper':   { lat: 10.6958, lng: 122.5694 },
  'Jaro':          { lat: 10.7290, lng: 122.5476 },
  'La Paz':        { lat: 10.7115, lng: 122.5553 },
  'Mandurriao':    { lat: 10.7210, lng: 122.5480 },
  'Molo':          { lat: 10.6827, lng: 122.5597 },
  'Arevalo':       { lat: 10.6682, lng: 122.5437 },
  'Lapaz':         { lat: 10.7115, lng: 122.5553 },
  'Bonifacio':     { lat: 10.7050, lng: 122.5640 },
  'Villa Arevalo': { lat: 10.6700, lng: 122.5500 },
  'Other':         { lat: 10.6965, lng: 122.5654 }, // Iloilo city center
}

const DISTRICTS = Object.keys(DISTRICT_CENTROIDS)

export default function IncidentReportForm({ onSubmitted }) {
  const addIncident = useIncidentStore((s) => s.addIncident)
  const [form, setForm] = useState({
    type:        '',
    severity:    'moderate',
    district:    '',
    address:     '',
    description: '',
    reporter:    '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.type)               return setError('Please select an incident type.')
    if (!form.district)           return setError('Please select a district.')
    if (!form.description.trim()) return setError('Please describe the incident.')
    setError('')

    // Attach district centroid so the marker shows on TrafficMap
    const centroid = DISTRICT_CENTROIDS[form.district] ?? DISTRICT_CENTROIDS['Other']
    addIncident({ ...form, lat: centroid.lat, lng: centroid.lng })

    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setForm({ type: '', severity: 'moderate', district: '', address: '', description: '', reporter: '' })
      onSubmitted?.()
    }, 2500)
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <div className="text-lg font-semibold text-green-700 dark:text-green-300">Incident Reported</div>
        <div className="text-sm text-green-600 dark:text-green-400 mt-1">Your report has been logged and will appear on the map.</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        📢 Submit Incident Report
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Incident Type <span className="text-red-500">*</span></label>
          <select
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
          >
            <option value="">Select type…</option>
            {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Severity</label>
          <div className="flex gap-2">
            {SEVERITY.map((s) => (
              <button
                type="button"
                key={s.value}
                onClick={() => set('severity', s.value)}
                className={`flex-1 rounded-lg border text-xs font-semibold py-1.5 transition-all ${
                  form.severity === s.value
                    ? s.cls + ' border-transparent ring-2 ring-offset-1 ring-brand-600'
                    : 'border-black/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* District + Address */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">District <span className="text-red-500">*</span></label>
            <select
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
            >
              <option value="">Select…</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Street / Landmark</label>
            <input
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="e.g. Rizal St corner Iznart"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Description <span className="text-red-500">*</span></label>
          <textarea
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
            rows={3}
            placeholder="Briefly describe the incident…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Reporter */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Reported by (optional)</label>
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="Name or unit (e.g. CDRRMO-Responder-1)"
            value={form.reporter}
            onChange={(e) => set('reporter', e.target.value)}
          />
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}

        <button
          type="submit"
          className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
        >
          Submit Report
        </button>
      </form>
    </div>
  )
}
