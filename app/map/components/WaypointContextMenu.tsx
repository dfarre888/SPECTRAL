'use client'

import { useState } from 'react'
import type { PlacedUas } from '@/lib/map/types'

export interface WaypointContextTarget {
  uasInstanceId: string
  waypointId: string
  assetName: string
  alt_m: number
  speed_kmh: number
  maxAlt_m: number
  maxSpeed_kmh: number
  screenX: number
  screenY: number
}

interface WaypointContextMenuProps {
  target: WaypointContextTarget
  onApply: (patch: { alt_m: number; speed_kmh: number }) => void
  onClose: () => void
}

export function WaypointContextMenu({ target, onApply, onClose }: WaypointContextMenuProps) {
  const [alt_m, setAlt_m] = useState(Math.round(target.alt_m))
  const [speed_kmh, setSpeed_kmh] = useState(Math.round(target.speed_kmh))
  return (
    <>
      <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Close menu" onClick={onClose} />
      <div className="absolute z-40 w-52 rounded-xl store-panel shadow-xl border border-[var(--store-line)] overflow-hidden pointer-events-auto p-3 space-y-2" style={{ left: target.screenX, top: target.screenY }}>
        <p className="text-[10px] store-text-muted truncate">Waypoint · {target.assetName}</p>
        <label className="block text-[10px] store-text-muted">Altitude AMSL (m)
          <input type="number" min={target.alt_m - 500} max={target.maxAlt_m} value={alt_m} onChange={(e) => setAlt_m(Number(e.target.value))} className="mt-1 w-full rounded-lg store-panel-inner border border-[var(--store-line)] px-2 py-1 font-mono text-[11px] text-white" />
        </label>
        <label className="block text-[10px] store-text-muted">Speed (km/h)
          <input type="number" min={1} max={target.maxSpeed_kmh} value={speed_kmh} onChange={(e) => setSpeed_kmh(Number(e.target.value))} className="mt-1 w-full rounded-lg store-panel-inner border border-[var(--store-line)] px-2 py-1 font-mono text-[11px] text-white" />
        </label>
        <button type="button" onClick={() => { onApply({ alt_m: Math.min(target.maxAlt_m, Math.max(1, alt_m)), speed_kmh: Math.min(target.maxSpeed_kmh, Math.max(1, speed_kmh)) }); onClose() }} className="store-btn-primary w-full py-1.5 text-[11px] font-semibold">Apply</button>
      </div>
    </>
  )
}
