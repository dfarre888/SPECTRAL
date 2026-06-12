'use client'

import { X } from 'lucide-react'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
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
      className="absolute z-20 w-72 rounded-2xl store-panel shadow-xl pointer-events-auto backdrop-blur-sm"
      style={{ left: screenX + 12, top: screenY - 8 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--store-line)] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformThumbnail id={uas.asset.id} name={uas.asset.name} size="sm" />
          <p className="text-sm font-semibold text-white truncate">{uas.asset.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 store-text-muted hover:text-white hover:bg-[var(--store-surface-2)]"
          aria-label="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2 text-[11px]">
        <DataRow label="Position" value={formatCoord(uas.lon, uas.lat)} accent />
        <DataRow label="Terrain AMSL" value={`${Math.round(uas.terrainAMSL)} m`} />
        <DataRow
          label="Service ceiling"
          value={`${uas.asset.max_altitude_agl_m} m ${uas.asset.altitude_reference === 'AMSL' ? 'AMSL' : 'AGL'}`}
        />
        <DataRow
          label="Envelope altitude"
          value={formatDiscAltitude(uas.asset, uas.terrainAMSL, uas.discAltitude_m)}
        />
        <DataRow label="Combat envelope" value={`${(uas.lateralRadius_m / 1000).toFixed(1)} km`} />
        {uas.asset.max_range_km > uas.lateralRadius_m / 1000 + 0.05 && (
          <DataRow label="OSINT ferry max" value={`${uas.asset.max_range_km.toFixed(1)} km`} />
        )}
        {uas.effectiveRange_km < uas.lateralRadius_m / 1000 - 0.05 && (
          <DataRow label="Wind-adjusted" value={`${uas.effectiveRange_km.toFixed(1)} km`} />
        )}
        <DataRow label="Time to perimeter" value={formatHHMM(uas.annotationTime_min)} accent />
        <DataRow label="Ceiling AMSL" value={`${Math.round(uas.ceilingAMSL_m)} m`} />
        <DataRow label="Endurance" value={formatHHMM(uas.asset.endurance_min)} />
        {uas.loiter?.exceedsEndurance && (
          <p className="text-[var(--store-accent)] pt-1 text-[11px]">
            Endurance warning — loiter exceeds fuel/time envelope
          </p>
        )}
        {!uas.loiter && (
          <p className="store-text-muted pt-1 text-[11px]">
            Use Place Loiter in the sidebar to plan time on station.
          </p>
        )}
      </div>
    </div>
  )
}

function DataRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="store-text-muted shrink-0">{label}</span>
      <span
        className={
          accent ? 'font-mono text-[var(--store-accent)] text-right' : 'font-mono store-text-body text-right'
        }
      >
        {value}
      </span>
    </div>
  )
}
