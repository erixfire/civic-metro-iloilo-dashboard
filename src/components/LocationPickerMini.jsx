import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icons for Leaflet in Vite/React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Syncs map center when lat/lng props change externally (e.g. GPS update) */
function MapSync({ lat, lng }) {
  const map = useMap()
  const prev = useRef(null)
  useEffect(() => {
    if (lat && lng) {
      const key = `${lat},${lng}`
      if (key !== prev.current) {
        map.setView([lat, lng], 16, { animate: true })
        prev.current = key
      }
    }
  }, [lat, lng, map])
  return null
}

/** Click on map to place/move pin */
function ClickHandler({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/**
 * LocationPickerMini
 * Props:
 *   lat, lng        — current pin coordinates (or null)
 *   onChange(lat, lng) — called when pin is moved
 */
export default function LocationPickerMini({ lat, lng, onChange }) {
  const center = lat && lng ? [lat, lng] : [10.6965, 122.5654] // Iloilo City default

  return (
    <div className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10" style={{ height: 150 }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapSync lat={lat} lng={lng} />
        <ClickHandler onChange={onChange} />
        {lat && lng && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend(e) {
                const ll = e.target.getLatLng()
                onChange(ll.lat, ll.lng)
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
