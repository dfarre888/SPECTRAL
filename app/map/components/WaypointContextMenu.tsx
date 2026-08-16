'use client'

import { useState } from 'react'

export interface WaypointContextTarget {
  uasInstanceId: string
  waypointId: string
  assetName: string
  lon: number
  lat: number
  alt_m: number
  speed_kmh: number
  maxAlt_m: number
  maxSpeed_kmh: number
  screenX: number
  screenY: number
}

interface WaypointContextMenuProps {
  target: WaypointContextTarget
  onApply: (patch: { alt_m: number; speed_kmh: number; lon?: number; lat?: number }) => void
  onClose: () => void
}

function validateCoordinates(lon: number, lat: number): string | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return 'Enter valid numeric coordinates.'
  if (lon < -180 || lon > 180) return 'Longitude must be between -180 and 180.'
  if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90.'
  return null
}

export function WaypointContextMenu({ target, onApply, onClose }: WaypointContextMenuProps) {
  const [lon, setLon] = useState(Number(target.lon.toFixed(5)))
  const [lat, setLat] = useState(Number(target.lat.toFixed(5)))
  const [alt_m, setAlt_m] = useState(Math.round(target.alt_m))
  const [speed_kmh, setSpeed_kmh] = useState(Math.round(target.speed_kmh))
  const [coordError, setCoordError] = useState<string | null>(null)

  const handleApply = () => {
    const error = validateCoordinates(lon, lat)
    if (error) {
      setCoordError(error)
      return
    }
    setCoordError(null)
    onApply({
      lon,
      lat,
      alt_m: Math.min(target.maxAlt_m, Math.max(1, alt_m)),
      speed_kmh: Math.min(target.maxSpeed_kmh, Math.max(1, speed_kmh)),
    })
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Close menu" onClick={onClose} />
      <div className="map-material-float absolute z-40 w-56 rounded-xl overflow-hidden pointer-events-auto p-3 space-y-2" style={{ left: target.screenX, top: target.screenY }}>
        <p className="text-[10px] store-text-muted truncate">Waypoint · {target.assetName}</p>
        <label className="block text-[10px] store-text-muted">Longitude
          <input
            type="number"
            step="0.00001"
            value={lon}
            onChange={(e) => {
              setLon(Number(e.target.value))
              setCoordError(null)
            }}
            className="mt-1 w-full rounded-lg store-panel-inner border border-[var(--store-line)] px-2 py-1 font-mono text-[11px] text-white"
          />
        </label>
        <label className="block text-[10px] store-text-muted">Latitude
          <input
            type="number"
            step="0.00001"
            value={lat}
            onChange={(e) => {
              setLat(Number(e.target.value))
              setCoordError(null)
            }}
            className="mt-1 w-full rounded-lg store-panel-inner border border-[var(--store-line)] px-2 py-1 font-mono text-[11px] text-white"
          />
        </label>
        {coordError && <p className="text-[10px] text-red-400 font-mono">{coordError}</p>}
        <label className="block text-[10px] store-text-muted">Altitude AMSL (m)
          <input type="number" min={target.alt_m - 500} max={target.maxAlt_m} value={alt_m} onChange={(e) => setAlt_m(Number(e.target.value))} className="mt-1 w-full rounded-lg store-panel-inner border border-[var(--store-line)] px-2 py-1 font-mono text-[11px] text-white" />
        </label>
        <label className="block text-[10px] store-text-muted">Speed (km/h)
          <input type="number" min={1} max={target.maxSpeed_kmh} value={speed_kmh} onChange={(e) => setSpeed_kmh(Number(e.target.value))} className="mt-1 w-full rounded-lg store-panel-inner border border-[var(--store-line)] px-2 py-1 font-mono text-[11px] text-white" />
        </label>
        <button type="button" onClick={handleApply} className="store-btn-primary w-full py-1.5 text-[11px] font-semibold">Apply</button>
      </div>
    </>
  )
}
