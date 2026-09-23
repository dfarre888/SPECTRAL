'use client'

import { X } from 'lucide-react'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { formatCoord, formatDiscAltitude, formatHHMM } from '@/lib/map/format'
import { computeMissionFlightDetails } from '@/lib/map/mission-flight-details'
import type { PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types'

interface EntityInfoPanelProps {
  uas: PlacedUas
  screenX: number
  screenY: number
  onClose: () => void
  placedCuas?: PlacedCuas[]
  placedRadars?: PlacedRadar[]
  placedEffectors?: PlacedEffector[]
}

export function EntityInfoPanel({
  uas,
  screenX,
  screenY,
  onClose,
  placedCuas = [],
  placedRadars = [],
  placedEffectors = [],
}: EntityInfoPanelProps) {
  const flight = computeMissionFlightDetails(uas, placedCuas, placedRadars, placedEffectors)
  return (
    <div
      className="glass-popover absolute z-20 w-72 pointer-events-auto flex flex-col max-h-[min(70vh,560px)] overflow-hidden"
      style={{ left: screenX + 12, top: screenY - 8 }}
    >
      <div className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-[var(--glass-line)] gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformThumbnail id={uas.asset.id} name={uas.asset.name} size="sm" />
          <p className="text-[13px] font-semibold text-[var(--store-ink)] leading-snug line-clamp-2" title={uas.asset.name}>
            {uas.asset.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="glass-icon-btn !w-7 !h-7 !rounded-lg shrink-0"
          aria-label="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <dl className="px-4 py-2.5 text-[12px] overflow-y-auto min-h-0">
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
        {uas.mission && (
          <>
            <DataRow label="Mission" value={uas.mission.goalKind.toUpperCase()} accent />
            <DataRow
              label="Route objective"
              value={
                uas.mission.routeObjective === 'combined'
                  ? 'Pk+Pd (combined)'
                  : uas.mission.routeObjective === 'pk'
                    ? 'Pk (defeat)'
                    : 'Pd (detection)'
              }
            />
            <DataRow label="Path distance" value={`${uas.mission.totalDistance_km.toFixed(1)} km`} />
            {flight && (
              <>
                <DataRow label="Time to target" value={formatHHMM(flight.timeToTarget_min)} accent />
                <DataRow label="Cruise alt" value={`${flight.cruiseAlt_m} m AMSL`} />
                <DataRow label="Cruise speed" value={`${flight.avgSpeed_kmh} km/h`} />
              </>
            )}
            <DataRow
              label="Max Pd"
              value={`${uas.mission.maxPd_pct}%`}
              accent={uas.mission.pdThresholdExceeded}
            />
            <DataRow label="Max Pk" value={`${uas.mission.maxPk_pct}%`} accent={uas.mission.pkThresholdExceeded} />
            <DataRow label="EMCON" value={uas.mission.emcon ? 'ON' : 'OFF (transit)'} />
          </>
        )}
        {uas.loiter?.exceedsEndurance && (
          <p className="text-[#FCD34D] pt-2 text-[12px]">
            Endurance warning: loiter exceeds the fuel and time envelope.
          </p>
        )}
        {!uas.loiter && (
          <p className="store-text-muted pt-2 text-[12px]">
            Use Place loiter in the asset panel to plan time on station.
          </p>
        )}
      </dl>
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
    <div className="flex items-baseline justify-between gap-3 py-[5px] border-b border-[var(--store-line)] last:border-b-0">
      <dt className="store-text-body shrink-0">{label}</dt>
      <dd
        className={
          accent
            ? 'font-mono text-[var(--wb-blue)] text-right tabular-nums'
            : 'font-mono text-[var(--store-ink)] text-right tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  )
}
