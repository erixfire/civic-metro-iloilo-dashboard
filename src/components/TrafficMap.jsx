import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { ILOILO_CENTER, TRAFFIC_POINTS } from '../data/mockData'

const COLOR_MAP = {
  red:    '#ef4444',
  orange: '#f97316',
  green:  '#22c55e',
}

const STATUS_LABEL = {
  Heavy:    { badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  Moderate: { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  Clear:    { badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
}

export default function TrafficMap() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
      <div className="px-5 py-3 bg-white dark:bg-zinc-900 border-b border-black/10 dark:border-white/10">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          🗺️ Traffic Map — Iloilo City
        </h2>
      </div>
      <MapContainer
        center={ILOILO_CENTER}
        zoom={13}
        style={{ height: '380px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {TRAFFIC_POINTS.map((pt) => (
          <CircleMarker
            key={pt.id}
            center={[pt.lat, pt.lng]}
            radius={10}
            pathOptions={{
              fillColor: COLOR_MAP[pt.color] ?? '#94a3b8',
              color: '#fff',
              weight: 2,
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">{pt.road}</div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_LABEL[pt.status]?.badge ?? 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {pt.status}
                </span>
                {pt.note && (
                  <div className="text-xs text-gray-500 mt-1">{pt.note}</div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
