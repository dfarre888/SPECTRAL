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
    <div className="flex items-start gap-2 min-w-0">
      <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', warn ? 'text-[var(--store-accent)]' : 'text-cyan')} />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wide store-text-muted">{label}</p>
        <p className={cn('font-mono text-[11px]', warn ? 'text-[var(--store-accent)]' : 'text-white')}>{value}</p>
      </div>
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
    <div className="map-material-float shrink-0 rounded-xl w-full">
      <div className="px-3 py-2 border-b border-[var(--store-line)] bg-[var(--store-surface-2)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Route className="w-3.5 h-3.5 text-[var(--store-accent)] shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)]">
              Flight details
            </span>
          </div>
          <span className="text-[10px] store-text-muted truncate">{uas.asset.name}</span>
        </div>
      </div>

      <div className="p-3 space-y-3 text-[11px]">
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={Mountain} label="Cruise alt" value={`${details.cruiseAlt_m} m AMSL (${details.cruiseAgl_m} m AGL)`} />
          <Metric icon={Gauge} label="Cruise speed" value={`${details.avgSpeed_kmh} km/h`} />
          <Metric icon={Clock} label="Time to target" value={formatHHMM(details.timeToTarget_min)} />
          <Metric icon={Target} label="Path distance" value={`${details.distance_km.toFixed(1)} km · ${details.waypointCount} wp`} />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--store-line)]">
          <div>
            <p className="text-[9px] uppercase tracking-wide store-text-muted mb-0.5">Max Pk</p>
            <p className={cn('font-mono text-sm', details.pkThresholdExceeded ? 'text-[var(--store-accent)]' : 'text-green-400')}>
              {details.maxPk_pct}%
            </p>
            <p className="font-mono text-[9px] store-text-muted">Exposure {details.pkExposure_km.toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide store-text-muted mb-0.5">Max Pd</p>
            <p className={cn('font-mono text-sm', details.pdThresholdExceeded ? 'text-[var(--store-accent)]' : 'text-cyan')}>
              {details.maxPd_pct}%
            </p>
            <p className="font-mono text-[9px] store-text-muted">Exposure {details.pdExposure_km.toFixed(1)} km</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
          <span className="px-1.5 py-0.5 rounded border border-[var(--store-line)] store-text-muted">
            {details.routeObjective === 'combined'
              ? 'Pk+Pd route'
              : details.routeObjective === 'pk'
                ? 'Pk route'
                : 'Pd route'}
          </span>
          <span className="px-1.5 py-0.5 rounded border border-[var(--store-line)] store-text-muted">{details.pathMode}</span>
          <span className="px-1.5 py-0.5 rounded border border-[var(--store-line)] store-text-muted">EMCON {details.emcon ? 'ON' : 'OFF'}</span>
          {details.manualOverride && (
            <span className="px-1.5 py-0.5 rounded border border-[var(--store-accent-border)] text-[var(--store-accent)]">Manual edit</span>
          )}
        </div>

        {!details.routeOptimal ? (
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-950/25 px-2.5 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-100/95 leading-snug">{details.routeAssessment}</p>
          </div>
        ) : (
          <p className="text-[10px] store-text-muted leading-snug">{details.routeAssessment}</p>
        )}

        {onReplan && !details.routeOptimal && (
          <button type="button" onClick={onReplan} className="w-full store-btn-primary py-1.5 text-[10px] font-semibold">
            Replan around threats
          </button>
        )}
      </div>
    </div>
  )
}
