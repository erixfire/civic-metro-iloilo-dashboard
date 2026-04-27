import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import { ILOILO_CENTER, TRAFFIC_POINTS, RAIN_GAUGES } from '../data/mockData'
import useIncidentStore from '../store/useIncidentStore'

const COLOR_MAP = {
  red:    '#ef4444',
  orange: '#f97316',
  green:  '#22c55e',
}

const STATUS_BADGE = {
  Heavy:    'bg-red-100 text-red-700',
  Moderate: 'bg-orange-100 text-orange-700',
  Clear:    'bg-green-100 text-green-700',
}

const RAIN_COLOR = {
  Critical: '#ef4444',
  Alarming: '#eab308',
  Normal:   '#22c55e',
}

const TYPE_ICON_MAP = {
  flood: '💧', fire: '🔥', traffic: '🚦',
  medical: '🚑', power: '⚡', landslide: '⛰️', crime: '🚨', other: 'ℹ️',
}

function makeIncidentIcon(type, severity) {
  const emoji = TYPE_ICON_MAP[type] ?? 'ℹ️'
  const bg    = severity === 'high' ? '#fca5a5' : severity === 'moderate' ? '#fde68a' : '#bbf7d0'
  return L.divIcon({
    html: `<div style="background:${bg};border:2px solid rgba(0,0,0,.25);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function InvalidateSizeOnMount() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100) }, [map])
  return null
}

export default function TrafficMap() {
  const incidents = useIncidentStore((s) => s.incidents.filter((i) => i.status === 'active'))

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
      <div className="px-5 py-3 bg-white dark:bg-zinc-900 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          🗺️ City Operations Map — Iloilo
        </h2>
        <div className="flex gap-3 text-[10px] text-zinc-400">
          <span>🔴🟡🟢 Traffic</span>
          <span>💧 Rain gauge</span>
          <span>📌 Incident</span>
        </div>
      </div>

      <MapContainer
        center={ILOILO_CENTER}
        zoom={13}
        style={{ height: '420px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <InvalidateSizeOnMount />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Traffic dots */}
        {TRAFFIC_POINTS.map((pt) => (
          <CircleMarker
            key={pt.id}
            center={[pt.lat, pt.lng]}
            radius={10}
            pathOptions={{ fillColor: COLOR_MAP[pt.color] ?? '#94a3b8', color: '#fff', weight: 2, fillOpacity: 0.85 }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">{pt.road}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[pt.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {pt.status}
                </span>
                {pt.note && <div className="text-xs text-gray-500 mt-1">{pt.note}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Rain gauge dots */}
        {RAIN_GAUGES.map((g) => (
          <CircleMarker
            key={g.id}
            center={[g.lat, g.lng]}
            radius={7}
            pathOptions={{ fillColor: RAIN_COLOR[g.level] ?? '#94a3b8', color: '#fff', weight: 1.5, fillOpacity: 0.7, dashArray: '4 2' }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">💧 {g.name}</div>
                <div className="text-xs text-gray-600">
                  Level: <span className="font-medium">{g.level}</span>
                </div>
                {g.rainfall1h != null && <div className="text-xs text-gray-500">{g.rainfall1h} mm/hr</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Incident markers */}
        {incidents.map((inc) => {
          if (!inc.lat || !inc.lng) return null
          return (
            <Marker
              key={inc.id}
              position={[inc.lat, inc.lng]}
              icon={makeIncidentIcon(inc.type, inc.severity)}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold mb-1">{TYPE_ICON_MAP[inc.type]} {inc.type}</div>
                  <div className="text-xs text-gray-600">{inc.district} — {inc.address}</div>
                  <div className="text-xs text-gray-500 mt-1">{inc.description}</div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
