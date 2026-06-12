'use client'

import { X } from 'lucide-react'
import { formatCoord, formatDiscAltitude, formatHHMM } from '@/lib/map/format'
import type { PlacedUas } from '@/lib/map/types'

interface EntityInfoPanelProps {
  uas: PlacedUas
  screenX: number
  screenY: number
  onClose: () => void
}

export function EntityInfoPanel({
  uas,
  screenX,
  screenY,
  onClose,
}: EntityInfoPanelProps) {
  return (
    <div
      className="absolute z-20 w-64 rounded-lg border border-border bg-surf1/95 backdrop-blur shadow-xl pointer-events-auto"
      style={{ left: screenX + 12, top: screenY - 8 }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <p className="text-xs font-semibold text-t-primary truncate">{uas.asset.name}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-t-muted hover:text-t-primary"
          aria-label="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-1.5 text-[10px] font-mono text-t-secondary">
        <div className="flex justify-between">
          <span className="text-t-muted">Position</span>
          <span className="text-cyan">{formatCoord(uas.lon, uas.lat)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Terrain AMSL</span>
          <span>{Math.round(uas.terrainAMSL)} m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Service ceiling (OSINT)</span>
          <span>
            {uas.asset.max_altitude_agl_m} m{' '}
            {uas.asset.altitude_reference === 'AMSL' ? 'AMSL' : 'AGL'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Envelope altitude</span>
          <span>{formatDiscAltitude(uas.asset, uas.terrainAMSL, uas.discAltitude_m)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Combat envelope</span>
          <span>{(uas.lateralRadius_m / 1000).toFixed(1)} km</span>
        </div>
        {uas.asset.max_range_km > uas.lateralRadius_m / 1000 + 0.05 && (
          <div className="flex justify-between">
            <span className="text-t-muted">OSINT max range (ferry)</span>
            <span>{uas.asset.max_range_km.toFixed(1)} km</span>
          </div>
        )}
        {uas.effectiveRange_km < uas.lateralRadius_m / 1000 - 0.05 && (
          <div className="flex justify-between">
            <span className="text-t-muted">Wind-adjusted</span>
            <span>{uas.effectiveRange_km.toFixed(1)} km</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-t-muted">Time to perimeter</span>
          <span className="text-orange">{formatHHMM(uas.annotationTime_min)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-t-muted">Endurance</span>
          <span>{formatHHMM(uas.asset.endurance_min)}</span>
        </div>
        {uas.loiter?.exceedsEndurance && (
          <p className="text-orange pt-1">Endurance warning — loiter exceeds fuel/time envelope</p>
        )}
        {!uas.loiter && (
          <p className="text-t-muted pt-1">
            Use Place Loiter in the sidebar to plan time on station.
          </p>
        )}
      </div>
    </div>
  )
}
