import { useState, useEffect, lazy, Suspense } from 'react'
import useIncidentStore from '../store/useIncidentStore'
import useGeolocation from '../hooks/useGeolocation'

const LocationPickerMini = lazy(() => import('./LocationPickerMini'))

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
    type:           '',
    severity:       'moderate',
    district:       '',
    address:        '',
    description:    '',
    reporter:       '',
    lat:            null,
    lng:            null,
    locationSource: 'district', // 'district' | 'gps' | 'manual'
  })

  const [submitted,   setSubmitted]   = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [error,       setError]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [showMap,     setShowMap]     = useState(false)

  const { coords, status: geoStatus, error: geoError, request: requestGeo, reset: resetGeo } = useGeolocation()

  // When GPS succeeds, apply coords to form
  useEffect(() => {
    if (geoStatus === 'success' && coords) {
      setForm((f) => ({
        ...f,
        lat:            coords.lat,
        lng:            coords.lng,
        locationSource: 'gps',
      }))
      setShowMap(true)
    }
  }, [geoStatus, coords])

  // When district changes and no GPS/manual pin set, apply centroid
  useEffect(() => {
    if (form.locationSource === 'district' && form.district) {
      const c = DISTRICT_CENTROIDS[form.district] ?? DISTRICT_CENTROIDS['Other']
      setForm((f) => ({ ...f, lat: c.lat, lng: c.lng }))
    }
  }, [form.district, form.locationSource])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleMapChange(lat, lng) {
    setForm((f) => ({ ...f, lat, lng, locationSource: 'manual' }))
  }

  function handleClearLocation() {
    resetGeo()
    setForm((f) => ({ ...f, lat: null, lng: null, locationSource: 'district' }))
    setShowMap(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.type)               return setError('Please select an incident type.')
    if (!form.district)           return setError('Please select a district.')
    if (!form.description.trim()) return setError('Please describe the incident.')
    setError('')
    setSubmitting(true)

    // Priority: GPS/manual pin → district centroid fallback
    const centroid = DISTRICT_CENTROIDS[form.district] ?? DISTRICT_CENTROIDS['Other']
    const finalLat = form.lat ?? centroid.lat
    const finalLng = form.lng ?? centroid.lng

    const result = await addIncident({
      ...form,
      lat: finalLat,
      lng: finalLng,
    })
    setSubmittedId(result?.id ?? null)
    setSubmitting(false)
    setSubmitted(true)

    setTimeout(() => {
      setSubmitted(false)
      setSubmittedId(null)
      setForm({
        type: '', severity: 'moderate', district: '', address: '',
        description: '', reporter: '', lat: null, lng: null, locationSource: 'district',
      })
      setShowMap(false)
      resetGeo()
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

        {/* ── Location Section ── */}
        <div className="rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">📍 Pin Location</span>
            {form.locationSource !== 'district' && (
              <button
                type="button"
                onClick={handleClearLocation}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
              >
                ✕ Reset to district
              </button>
            )}
          </div>

          {/* GPS Button */}
          <button
            type="button"
            onClick={requestGeo}
            disabled={geoStatus === 'loading'}
            className="w-full text-xs py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-60 transition-colors font-medium"
          >
            {geoStatus === 'loading' ? '📡 Getting your location…' : '📍 Use My Current Location (GPS)'}
          </button>

          {/* Manual lat/lng override */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1" htmlFor="incident-lat">Latitude</label>
              <input
                id="incident-lat"
                type="number"
                step="0.00001"
                placeholder="10.6965"
                value={form.lat ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) {
                    setForm((f) => ({ ...f, lat: v, locationSource: 'manual' }))
                    setShowMap(true)
                  }
                }}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1" htmlFor="incident-lng">Longitude</label>
              <input
                id="incident-lng"
                type="number"
                step="0.00001"
                placeholder="122.5654"
                value={form.lng ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) {
                    setForm((f) => ({ ...f, lng: v, locationSource: 'manual' }))
                    setShowMap(true)
                  }
                }}
                className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>

          {/* Status feedback */}
          {geoStatus === 'success' && form.locationSource === 'gps' && (
            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              ✅ GPS location captured
              <span className="font-mono text-green-500 dark:text-green-500">
                ({coords?.lat?.toFixed(5)}, {coords?.lng?.toFixed(5)})
              </span>
              {coords?.accuracy && (
                <span className="text-zinc-400">±{Math.round(coords.accuracy)}m</span>
              )}
            </div>
          )}
          {form.locationSource === 'manual' && form.lat && form.lng && (
            <div className="text-xs text-blue-500 dark:text-blue-400">
              📌 Manual pin: ({form.lat?.toFixed(5)}, {form.lng?.toFixed(5)})
            </div>
          )}
          {form.locationSource === 'district' && form.district && (
            <div className="text-xs text-zinc-400">
              🏘️ Using district centroid for {form.district}
            </div>
          )}
          {geoError && (
            <div className="text-xs text-red-500" role="alert">⚠️ {geoError}</div>
          )}

          {/* Toggle mini map */}
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline transition-colors"
          >
            {showMap ? '▲ Hide map' : '▼ Show map to fine-tune pin'}
          </button>

          {/* Mini Map */}
          {showMap && (
            <Suspense fallback={<div className="h-36 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">Loading map…</div>}>
              <LocationPickerMini
                lat={form.lat}
                lng={form.lng}
                onChange={handleMapChange}
              />
              <p className="text-xs text-zinc-400 text-center">Click on the map or drag the pin to adjust location</p>
            </Suspense>
          )}
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
