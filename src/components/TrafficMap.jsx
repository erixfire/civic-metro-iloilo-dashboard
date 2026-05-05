/**
 * TrafficMap — Waze embed + Leaflet City Ops map.
 * Mobile-optimised, ARIA tablist, i18n-aware.
 *
 * Waze iframe is lazy: rendered only when the Waze tab is selected.
 * This eliminates the TrustedScriptURL / TrustedHTML CSP noise and the
 * LivemapConfig 400 error that appear on dashboard load.
 */
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'
import { ILOILO_CENTER, TRAFFIC_POINTS, RAIN_GAUGES } from '../data/mockData'
import useIncidentStore from '../store/useIncidentStore'
import { useLang }      from '../hooks/useLang'

const COLOR_MAP   = { red: '#ef4444', orange: '#f97316', green: '#22c55e' }
const STATUS_BADGE = {
  Heavy:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Moderate: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Clear:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}
const RAIN_COLOR = { Critical: '#ef4444', Alarming: '#eab308', Normal: '#22c55e' }
const TYPE_ICON_MAP = { flood:'💧', fire:'🔥', traffic:'🚦', medical:'🚑', power:'⚡', landslide:'⛰️', crime:'🚨', other:'ℹ️' }

function makeIncidentIcon(type, severity) {
  const emoji = TYPE_ICON_MAP[type] ?? 'ℹ️'
  const bg = severity === 'high' ? '#fca5a5' : severity === 'moderate' ? '#fde68a' : '#bbf7d0'
  return L.divIcon({
    html: `<div style="background:${bg};border:2px solid rgba(0,0,0,.25);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;">${emoji}</div>`,
    className: '', iconSize: [32,32], iconAnchor: [16,16]
  })
}

function InvalidateSizeOnMount() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100) }, [map])
  return null
}

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 640

/**
 * WazeTab — iframe rendered only when active (wazeLoaded=true).
 * Prevents Trusted Types / LivemapConfig 400 errors on dashboard load.
 * The `allow` attribute grants geolocation so Waze can show location-aware
 * traffic without needing user/visitor_id params.
 */
function WazeTab({ t, active }) {
  const [wazeLoaded, setWazeLoaded] = useState(false)

  useEffect(() => {
    if (active && !wazeLoaded) setWazeLoaded(true)
  }, [active, wazeLoaded])

  return (
    <div className="relative">
      {wazeLoaded ? (
        <iframe
          src="https://embed.waze.com/iframe?zoom=13&lat=10.7202&lon=122.5621&ct=livemap&pin=0"
          width="100%"
          className="w-full block h-[260px] sm:h-[420px]"
          frameBorder="0"
          allowFullScreen
          allow="geolocation"
          title={t('Waze Live Traffic map for Iloilo City', 'Mapa sang Live Traffic sa Iloilo City')}
        />
      ) : (
        <div className="w-full h-[260px] sm:h-[420px] flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 text-zinc-400 text-sm">
          <span>Loading Waze map…</span>
        </div>
      )}
      <div
        className="absolute bottom-2 right-2 bg-white/80 dark:bg-zinc-900/80 text-[10px] text-zinc-500 px-2 py-1 rounded-md backdrop-blur-sm"
        aria-hidden="true"
      >
        Powered by Waze
      </div>
    </div>
  )
}

function CityOpsTab({ incidents, t }) {
  const mobile    = isMobile()
  const mapHeight = mobile ? '260px' : '420px'
  const tileUrl   = mobile
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const tileAttr  = mobile
    ? '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  return (
    <div role="region" aria-label={t('City operations map', 'Mapa sang Operasyon sang Siyudad')}>
      <MapContainer
        center={ILOILO_CENTER} zoom={mobile ? 12 : 13}
        style={{ height: mapHeight, width: '100%' }}
        scrollWheelZoom={false} tap={false}
      >
        <InvalidateSizeOnMount />
        <TileLayer url={tileUrl} attribution={tileAttr} detectRetina={false} />
        {TRAFFIC_POINTS.map((pt) => (
          <CircleMarker key={pt.id} center={[pt.lat, pt.lng]} radius={mobile ? 8 : 10}
            pathOptions={{ fillColor: COLOR_MAP[pt.color] ?? '#94a3b8', color:'#fff', weight:2, fillOpacity:0.85 }}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">{pt.road}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[pt.status] ?? 'bg-zinc-100 text-zinc-600'}`}>{pt.status}</span>
                {pt.note && <div className="text-xs text-gray-500 mt-1">{pt.note}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {RAIN_GAUGES.map((g) => (
          <CircleMarker key={g.id} center={[g.lat, g.lng]} radius={mobile ? 5 : 7}
            pathOptions={{ fillColor: RAIN_COLOR[g.level] ?? '#94a3b8', color:'#fff', weight:1.5, fillOpacity:0.7, dashArray:'4 2' }}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-1">💧 {g.name}</div>
                <div className="text-xs text-gray-600">{t('Level', 'Antas')}: <span className="font-medium">{g.level}</span></div>
                {g.rainfall1h != null && <div className="text-xs text-gray-500">{g.rainfall1h} mm/hr</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {incidents.map((inc) => {
          if (!inc.lat || !inc.lng) return null
          return (
            <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={makeIncidentIcon(inc.type, inc.severity)}>
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

const TABS = [
  { id: 'waze',    en: '🚦 Waze Live',  hil: '🚦 Waze Live' },
  { id: 'cityops', en: '🗺️ City Ops',   hil: '🗺️ Operasyon' },
]

export default function TrafficMap() {
  const [activeTab, setActiveTab] = useState('waze')
  const incidents = useIncidentStore((s) => s.incidents.filter((i) => i.status === 'active'))
  const { t } = useLang()

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100">
            {t('Traffic & City Map', 'Trapiko kag Mapa sang Siyudad')}
          </h2>
          <p className="text-xs text-zinc-400">
            {t('Iloilo City · Live', 'Iloilo City · Live')}
          </p>
        </div>
        <div
          role="tablist"
          aria-label={t('Map view', 'Talan-awon sang Mapa')}
          className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden shrink-0"
        >
          {TABS.map((tab) => (
            <button key={tab.id} role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#01696f] text-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {t(tab.en, tab.hil)}
            </button>
          ))}
        </div>
      </div>

      <div id="tabpanel-waze" role="tabpanel" aria-labelledby="tab-waze" hidden={activeTab !== 'waze'}>
        <WazeTab t={t} active={activeTab === 'waze'} />
      </div>
      <div id="tabpanel-cityops" role="tabpanel" aria-labelledby="tab-cityops" hidden={activeTab !== 'cityops'}>
        <CityOpsTab incidents={incidents} t={t} />
      </div>

      {activeTab === 'cityops' && (
        <div
          className="px-4 py-2.5 border-t border-black/5 dark:border-white/5 flex flex-wrap gap-3 text-[11px] text-zinc-400"
          aria-label={t('Map legend', 'Tanda sa Mapa')}
        >
          <span>🔴 {t('Heavy', 'Mabug-at')}</span>
          <span>🟡 {t('Moderate', 'Kasagaran')}</span>
          <span>🟢 {t('Clear', 'Luwas')}</span>
          <span>💧 {t('Rain gauge', 'Sukod sang ulan')}</span>
          <span>📌 {t('Active incident', 'Aktibo nga insidente')}</span>
        </div>
      )}
      {activeTab === 'waze' && (
        <div className="px-4 py-2.5 border-t border-black/5 dark:border-white/5 text-[11px] text-zinc-400">
          {t('Live Waze data · Open the Waze app for more detail', 'Live nga datos sa Waze · Buksa ang Waze app para sa mas detalye')}
        </div>
      )}
    </div>
  )
}
