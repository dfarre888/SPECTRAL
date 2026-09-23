'use client'

import { AlertTriangle, Clock, Gauge, Mountain, Route, Target } from 'lucide-react'
import { computeMissionFlightDetails } from '@/lib/map/mission-flight-details'
import { PD_THRESHOLD_PCT, PK_THRESHOLD_PCT } from '@/lib/map/mission-path-planner'
import { formatHHMM } from '@/lib/map/format'
import type { PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types'
import { cn } from '@/lib/utils'

interface FlightDetailsPanelProps {
  uas: PlacedUas
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  onReplan?: () => void
}

function Metric({
  icon: Icon,
  label,
  value,
  warn,
}: {
  icon: typeof Clock
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className="flex items-center gap-2 min-w-0 py-[5px] border-b border-[var(--store-line)] last:border-b-0">
      <Icon className={cn('w-3.5 h-3.5 shrink-0', warn ? 'text-[var(--wb-blue)]' : 'store-text-muted')} />
      <dt className="text-[12px] store-text-body shrink-0">{label}</dt>
      <dd
        className={cn(
          'ml-auto font-mono text-[12px] text-right tabular-nums min-w-0',
          warn ? 'text-[var(--wb-blue)]' : 'text-[var(--store-ink)]',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export function FlightDetailsPanel({
  uas,
  placedCuas,
  placedRadars,
  placedEffectors,
  onReplan,
}: FlightDetailsPanelProps) {
  const details = computeMissionFlightDetails(uas, placedCuas, placedRadars, placedEffectors)
  if (!details) return null

  return (
    <div className="glass-popover shrink-0 w-full">
      <div className="px-4 py-2.5 border-b border-[var(--glass-line)]">
        <div className="flex items-center gap-2 min-w-0">
          <Route className="w-4 h-4 store-text-muted shrink-0" />
          <span className="text-[13px] font-semibold text-[var(--store-ink)] shrink-0">Flight details</span>
          <span className="text-[12px] store-text-muted truncate min-w-0 ml-auto" title={uas.asset.name}>
            {uas.asset.name}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3 text-[12px]">
        <dl>
          <Metric icon={Mountain} label="Cruise alt" value={`${details.cruiseAlt_m} m AMSL (${details.cruiseAgl_m} m AGL)`} />
          <Metric icon={Gauge} label="Cruise speed" value={`${details.avgSpeed_kmh} km/h`} />
          <Metric icon={Clock} label="Time to target" value={formatHHMM(details.timeToTarget_min)} />
          <Metric icon={Target} label="Path distance" value={`${details.distance_km.toFixed(1)} km · ${details.waypointCount} wp`} />
        </dl>

        <div className="grid grid-cols-2 gap-2">
          <div className="pt-1">
            <p className="text-[12px] store-text-muted">Max Pk</p>
            <p className={cn('font-mono text-[20px] leading-none mt-1 tabular-nums', details.pkThresholdExceeded ? 'text-[var(--wb-blue)]' : 'text-[#4ADE80]')}>
              {details.maxPk_pct}%
            </p>
            <p className="font-mono text-[11.5px] store-text-muted mt-1">Exposure {details.pkExposure_km.toFixed(1)} km</p>
          </div>
          <div className="pt-1">
            <p className="text-[12px] store-text-muted">Max Pd</p>
            <p className={cn('font-mono text-[20px] leading-none mt-1 tabular-nums', details.pdThresholdExceeded ? 'text-[var(--wb-blue)]' : 'text-[#06B6D4]')}>
              {details.maxPd_pct}%
            </p>
            <p className="font-mono text-[11.5px] store-text-muted mt-1">Exposure {details.pdExposure_km.toFixed(1)} km</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="tag font-mono">
            {details.routeObjective === 'combined'
              ? 'Pk+Pd route'
              : details.routeObjective === 'pk'
                ? 'Pk route'
                : 'Pd route'}
          </span>
          <span className="tag font-mono">{details.pathMode}</span>
          <span className="tag font-mono">EMCON {details.emcon ? 'ON' : 'OFF'}</span>
          {details.manualOverride && <span className="tag blue">Manual edit</span>}
        </div>

        {!details.routeOptimal ? (
          <div className="flex gap-2 rounded-xl border border-[rgba(251,191,36,0.35)] px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#FBBF24] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#FDE68A] leading-snug">{details.routeAssessment}</p>
          </div>
        ) : (
          <p className="text-[12px] store-text-muted leading-snug">{details.routeAssessment}</p>
        )}

        {onReplan && !details.routeOptimal && (
          <button type="button" onClick={onReplan} className="btn-glass primary w-full !min-h-8">
            Replan around threats
          </button>
        )}
      </div>
    </div>
  )
}
