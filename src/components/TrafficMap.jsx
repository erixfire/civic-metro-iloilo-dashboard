import { MapContainer, TileLayer } from 'react-leaflet'
import { ILOILO_CENTER } from '../data/mockData'
import 'leaflet/dist/leaflet.css'

export default function TrafficMap() {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
        🗺️ Live Traffic Map — Metro Iloilo
      </h2>
      <div className="rounded-lg overflow-hidden" style={{ height: 300 }}>
        <MapContainer center={ILOILO_CENTER} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </div>
    </div>
  )
}
