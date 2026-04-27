/**
 * IncidentMap — Public-facing incident map using Leaflet + OpenStreetMap
 * Shows all active/recent incidents as colored pins with popups.
 * Citizens can tap a pin to see incident details.
 * Requires: npm install leaflet  (already in package.json after this commit)
 */
import { useEffect, useRef, useState } from 'react'
import useIncidentStore from '../store/useIncidentStore'

const SEVERITY_COLOR = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
  info:     '#3b82f6',
}

const STATUS_LABEL = {
  active:   { label: 'Active',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  pending:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
}

// Iloilo City center
const CENTER = [10.7202, 122.5621]

export default function IncidentMap() {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef([])
  const [ready, setReady] = useState(false)
  const [filter, setFilter] = useState('active')

  const { incidents, fetchIncidents } = useIncidentStore()

  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  // Dynamically import Leaflet (avoids SSR issues)
  useEffect(() => {
    if (leafletRef.current || !mapRef.current) return

    import('leaflet').then((L) => {
      // Fix default marker icon path
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        center: CENTER,
        zoom: 13,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://osm.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      leafletRef.current = { L, map }
      setReady(true)
    })

    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove()
        leafletRef.current = null
      }
    }
  }, [])

  // Re-render markers when incidents or filter changes
  useEffect(() => {
    if (!ready || !leafletRef.current) return
    const { L, map } = leafletRef.current

    // Clear old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const filtered = filter === 'all'
      ? incidents
      : incidents.filter((i) => i.status === filter)

    filtered.forEach((inc) => {
      const lat = parseFloat(inc.latitude)
      const lng = parseFloat(inc.longitude)
      if (!lat || !lng) return

      const color = SEVERITY_COLOR[inc.severity] ?? '#6b7280'
      const icon  = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:${color};border:2px solid #fff;
          box-shadow:0 1px 4px rgba(0,0,0,.4);
        "></div>`,
        iconSize:   [14, 14],
        iconAnchor: [7, 7],
      })

      const sl     = STATUS_LABEL[inc.status] ?? STATUS_LABEL.pending
      const popup  = `
        <div style="min-width:180px;font-family:sans-serif">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${inc.title ?? inc.type ?? 'Incident'}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:6px">${inc.location ?? ''}</div>
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:${color}22;color:${color};border:1px solid ${color}44;text-transform:capitalize">
            ${inc.severity ?? 'unknown'} severity
          </span>
          <span style="margin-left:4px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px">
            ${inc.status}
          </span>
          <div style="margin-top:6px;font-size:11px;color:#374151">${inc.description ?? ''}</div>
          <div style="margin-top:4px;font-size:10px;color:#9ca3af">${inc.reported_at ? new Date(inc.reported_at).toLocaleString('en-PH') : ''}</div>
        </div>`

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [ready, incidents, filter])

  const counts = {
    all:      incidents.length,
    active:   incidents.filter(i => i.status === 'active').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    pending:  incidents.filter(i => i.status === 'pending').length,
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">📍 Incident Map — Iloilo City</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time incident locations · OpenStreetMap</p>
        </div>
        <div className="flex gap-1.5">
          {['all','active','pending','resolved'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border capitalize transition-colors ${
                filter === f
                  ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-700'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 border-black/10 dark:border-white/10 hover:border-zinc-400'
              }`}>
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet map */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ height: '420px', width: '100%' }} />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-black/5 dark:border-white/5">
        {Object.entries(SEVERITY_COLOR).map(([sev, color]) => (
          <div key={sev} className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 capitalize">
            <span style={{ background: color }} className="inline-block w-3 h-3 rounded-full" />
            {sev}
          </div>
        ))}
      </div>
    </div>
  )
}
