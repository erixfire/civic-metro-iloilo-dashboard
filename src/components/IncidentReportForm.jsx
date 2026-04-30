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
  'Other':         { lat: 10.6965, lng: 122.5654 },
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
  const [submitted,   setSubmitted]   = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [error,       setError]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.type)               return setError('Please select an incident type.')
    if (!form.district)           return setError('Please select a district.')
    if (!form.description.trim()) return setError('Please describe the incident.')
    setError('')
    setSubmitting(true)

    const centroid = DISTRICT_CENTROIDS[form.district] ?? DISTRICT_CENTROIDS['Other']
    const result   = await addIncident({ ...form, lat: centroid.lat, lng: centroid.lng })
    setSubmittedId(result?.id ?? null)
    setSubmitting(false)
    setSubmitted(true)

    setTimeout(() => {
      setSubmitted(false)
      setSubmittedId(null)
      setForm({ type: '', severity: 'moderate', district: '', address: '', description: '', reporter: '' })
      onSubmitted?.()
    }, 4000)
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 p-8 text-center">
        <div className="text-4xl mb-3">⏳</div>
        <div className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Report Submitted — Pending Review</div>
        <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-2 leading-relaxed">
          Your report is queued for review by the Operations Team.
          <br />
          <span className="text-xs text-yellow-600 dark:text-yellow-500">
            Gisulod na ang imong report. Huwaton ang pag-apruba sang opisyal.
          </span>
        </div>
        {submittedId && (
          <div className="mt-3 text-xs font-mono text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1.5 rounded-lg inline-block">
            Ref: {submittedId}
          </div>
        )}
        <div className="mt-4 text-xs text-yellow-600 dark:text-yellow-500">
          🚨 For immediate emergencies, call <strong>911</strong> or ICER at <strong>(033) 320-0341</strong>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        📢 Submit Incident Report
      </h2>
      <p className="text-xs text-zinc-400 mb-4">
        Reports are reviewed by the Operations Team before appearing on the public map.
        For life-threatening emergencies, call <strong>911</strong>.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="incident-type">
            Incident Type <span className="text-red-500" aria-hidden>*</span>
          </label>
          <select
            id="incident-type"
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
          >
            <option value="">Select type…</option>
            {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Severity */}
        <fieldset>
          <legend className="block text-xs font-medium text-zinc-500 mb-1">Severity</legend>
          <div className="flex gap-2">
            {SEVERITY.map((s) => (
              <button
                type="button"
                key={s.value}
                onClick={() => set('severity', s.value)}
                aria-pressed={form.severity === s.value}
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
        </fieldset>

        {/* District + Address */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="incident-district">
              District <span className="text-red-500" aria-hidden>*</span>
            </label>
            <select
              id="incident-district"
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
            >
              <option value="">Select…</option>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="incident-address">
              Street / Landmark
            </label>
            <input
              id="incident-address"
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="e.g. Rizal St corner Iznart"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="incident-description">
            Description <span className="text-red-500" aria-hidden>*</span>
          </label>
          <textarea
            id="incident-description"
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
            rows={3}
            placeholder="Briefly describe the incident…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Reporter */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="incident-reporter">
            Reported by (optional)
          </label>
          <input
            id="incident-reporter"
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="Name or unit (e.g. CDRRMO-Responder-1)"
            value={form.reporter}
            onChange={(e) => set('reporter', e.target.value)}
          />
        </div>

        {error && <div className="text-xs text-red-500" role="alert">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>
    </div>
  )
}
