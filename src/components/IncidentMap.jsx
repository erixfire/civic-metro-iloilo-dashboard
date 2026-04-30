/**
 * IncidentMap — Public-facing incident map.
 * Mobile-optimised, accessible, i18n-aware.
 */
import { useEffect, useRef, useState } from 'react'
import useIncidentStore from '../store/useIncidentStore'
import { useLang }      from '../hooks/useLang'

const TYPE_EMOJI = {
  flood: '💧', fire: '🔥', traffic: '🚦',
  medical: '🚑', power: '⚡', landslide: '⛰️', crime: '🚨', other: 'ℹ️',
}

const TYPE_HIL = {
  flood: 'baha', fire: 'sunog', traffic: 'trapiko',
  medical: 'medikal', power: 'kuryente', landslide: 'paglusaw sang duta', crime: 'krimen', other: 'iban pa',
}

const SEVERITY_COLOR = {
  critical: '#ef4444', high: '#ef4444', moderate: '#f97316', medium: '#f97316', low: '#22c55e', info: '#3b82f6',
}
const SEVERITY_BG = {
  critical: '#fef2f2', high: '#fef2f2', moderate: '#fff7ed', medium: '#fff7ed', low: '#f0fdf4', info: '#eff6ff',
}

const FILTER_LABELS = {
  active:   { en: 'Active',   hil: 'Aktibo'   },
  resolved: { en: 'Resolved', hil: 'Nasulbad' },
  all:      { en: 'All',      hil: 'Tanan'    },
}

const CENTER = [10.7202, 122.5621]

function getCoords(inc) {
  const lat = parseFloat(inc.lat ?? inc.latitude)
  const lng = parseFloat(inc.lng ?? inc.longitude)
  if (isNaN(lat) || isNaN(lng)) return null
  return [lat, lng]
}

export default function IncidentMap() {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef([])
  const [ready,  setReady]  = useState(false)
  const [filter, setFilter] = useState('active')
  const { t }               = useLang()

  const { incidents, fetchIncidents } = useIncidentStore()
  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  useEffect(() => {
    if (leafletRef.current || !mapRef.current) return
    import('leaflet').then((L) => {
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      const map = L.map(mapRef.current, { center: CENTER, zoom: isMobile ? 12 : 13, zoomControl: true, tap: false, scrollWheelZoom: false })
      const tileUrl  = isMobile ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      const tileAttr = isMobile ? '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>' : '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
      L.tileLayer(tileUrl, { attribution: tileAttr, maxZoom: 19, detectRetina: false }).addTo(map)
      leafletRef.current = { L, map }; setReady(true)
    })
    return () => { if (leafletRef.current?.map) { leafletRef.current.map.remove(); leafletRef.current = null } }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !leafletRef.current) return
    const { L, map } = leafletRef.current
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    const filtered = filter === 'all' ? incidents : incidents.filter((i) => i.status === filter)
    filtered.forEach((inc) => {
      const coords = getCoords(inc)
      if (!coords) return
      const emoji = TYPE_EMOJI[inc.type] ?? 'ℹ️'
      const color = SEVERITY_COLOR[inc.severity] ?? '#6b7280'
      const bgCol = SEVERITY_BG[inc.severity]    ?? '#f9fafb'
      const icon  = L.divIcon({
        className: '',
        html: `<div role="img" aria-label="${inc.type}" style="width:34px;height:34px;border-radius:50%;background:${bgCol};border:2.5px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;cursor:pointer;">${emoji}</div>`,
        iconSize: [34,34], iconAnchor: [17,17], popupAnchor: [0,-20],
      })
      const reportedTime = inc.reportedAt ?? inc.reported_at ?? null
      const timeStr = reportedTime ? new Date(reportedTime).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : ''
      const popup = `<div style="min-width:190px;max-width:260px;font-family:Inter,sans-serif;"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><span style="font-size:20px">${emoji}</span><div><div style="font-weight:700;font-size:13px;text-transform:capitalize;">${inc.type}</div><div style="font-size:10px;color:#6b7280">${inc.district ?? ''}</div></div></div><div style="font-size:11px;color:#374151;margin-bottom:4px;">${inc.address ?? inc.location ?? ''}</div><div style="font-size:11px;color:#4b5563;margin-bottom:6px;">${inc.description ?? ''}</div><div style="display:flex;gap:4px;flex-wrap:wrap;"><span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:${color}22;color:${color};border:1px solid ${color}55;text-transform:capitalize;">${inc.severity}</span><span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:#f4f4f5;color:#3f3f46;">${inc.status}</span></div>${timeStr ? `<div style="margin-top:5px;font-size:10px;color:#9ca3af">${timeStr}</div>` : ''}</div>`
      markersRef.current.push(L.marker(coords, { icon }).bindPopup(popup, { maxWidth: 280 }).addTo(map))
    })
  }, [ready, incidents, filter])

  const counts = {
    all:      incidents.length,
    active:   incidents.filter(i => i.status === 'active').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 gap-2">
        <div>
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">
            📍 {t('Incident Map', 'Mapa sang mga Insidente')}
          </h2>
          <p className="text-xs text-zinc-400">
            {t('Incident Map · Iloilo City', 'Mapa sang mga Insidente · Iloilo City')}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label={t('Filter incidents by status', 'Salain ang mga insidente')}>
          {['active','resolved','all'].map((f) => {
            const lbl = FILTER_LABELS[f]
            return (
              <button key={f} onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border capitalize transition-colors ${
                  filter === f
                    ? 'bg-[#01696f] text-white border-[#01696f]'
                    : 'bg-white dark:bg-zinc-900 text-zinc-500 border-black/10 dark:border-white/10 hover:border-zinc-400'
                }`}
              >
                {t(lbl.en, lbl.hil)} ({counts[f] ?? 0})
              </button>
            )
          })}
        </div>
      </div>

      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="h-[300px] sm:h-[440px] w-full"
        role="application"
        aria-label={t('Interactive incident map of Iloilo City', 'Interaktibo nga mapa sang mga insidente sa Iloilo City')}
      />

      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2.5 border-t border-black/5 dark:border-white/5" aria-label={t('Incident type legend', 'Tanda sang klase sang insidente')}>
        {Object.entries(TYPE_EMOJI).map(([type, emoji]) => (
          <div key={type} className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 capitalize">
            <span aria-hidden="true">{emoji}</span>
            <span>{t(type, TYPE_HIL[type] ?? type)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
