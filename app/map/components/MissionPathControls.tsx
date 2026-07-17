'use client'

import { RefreshCw, Radio, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PD_THRESHOLD_PCT, PK_THRESHOLD_PCT } from '@/lib/map/mission-path-planner'
import type { MissionRouteObjective, PlacedUas } from '@/lib/map/types'

interface MissionPathControlsProps {
  uas: PlacedUas
  onReplan: () => void
  onClear: () => void
  onEmconChange: (enabled: boolean) => void
  onRouteObjectiveChange: (objective: MissionRouteObjective) => void
}

export function MissionPathControls({
  uas,
  onReplan,
  onClear,
  onEmconChange,
  onRouteObjectiveChange,
}: MissionPathControlsProps) {
  const mission = uas.mission
  if (!mission) return null

  const objective = mission.routeObjective ?? 'combined'
  const primaryMetric =
    objective === 'pd'
      ? { label: 'Max Pd', value: mission.maxPd_pct, threshold: PD_THRESHOLD_PCT, flag: mission.pdThresholdExceeded }
      : objective === 'pk'
        ? { label: 'Max Pk', value: mission.maxPk_pct, threshold: PK_THRESHOLD_PCT, flag: mission.pkThresholdExceeded }
        : mission.maxPk_pct >= mission.maxPd_pct
          ? { label: 'Max Pk', value: mission.maxPk_pct, threshold: PK_THRESHOLD_PCT, flag: mission.pkThresholdExceeded }
          : { label: 'Max Pd', value: mission.maxPd_pct, threshold: PD_THRESHOLD_PCT, flag: mission.pdThresholdExceeded }

  return (
    <div className="p-2.5 rounded-xl store-panel-inner border border-[var(--store-line)] text-[11px] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[var(--store-accent)] font-semibold text-[10px] tracking-wider uppercase">Mission path</span>
        <button type="button" onClick={onClear} className="store-text-muted hover:text-[var(--store-accent)]" title="Clear mission">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <p className="font-mono store-text-muted">{mission.goalKind.toUpperCase()} · {mission.totalDistance_km.toFixed(1)} km</p>

      <div className="flex gap-1">
        {(['combined', 'pd', 'pk'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onRouteObjectiveChange(mode)}
            className={cn(
              'flex-1 px-2 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wide',
              objective === mode
                ? 'border-[var(--store-accent-border)] bg-[var(--store-accent)]/15 text-[var(--store-accent)]'
                : 'border-[var(--store-line)] store-text-muted hover:store-text-body',
            )}
          >
            {mode === 'combined' ? 'Both' : mode === 'pd' ? 'Pd' : 'Pk'}
          </button>
        ))}
      </div>

      <p
        className={cn(
          'font-mono',
          primaryMetric.value >= primaryMetric.threshold ? 'text-[var(--store-accent)]' : 'store-text-body',
        )}
      >
        {primaryMetric.label} {primaryMetric.value}% {primaryMetric.flag ? `(≥${primaryMetric.threshold}% flag)` : ''}
      </p>
      <p className="font-mono store-text-muted text-[10px]">
        {objective === 'combined'
          ? `Pk ${mission.maxPk_pct}% · Pd ${mission.maxPd_pct}% · exp ${mission.pkExposure_km.toFixed(1)}/${mission.pdExposure_km.toFixed(1)} km`
          : objective === 'pd'
            ? `Pk ${mission.maxPk_pct}% · exposure ${mission.pdExposure_km.toFixed(1)} km`
            : `Pd ${mission.maxPd_pct}% · exposure ${mission.pkExposure_km.toFixed(1)} km`}
      </p>
      <p className="font-mono store-text-muted text-[10px]">{mission.pathMode} · {mission.waypoints.length} waypoints</p>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={mission.emcon}
          onChange={(e) => onEmconChange(e.target.checked)}
          className="rounded border-[var(--store-line)]"
        />
        <Radio className="w-3 h-3 text-[var(--store-accent)]" />
        <span className="store-text-body">EMCON (reduces Pd when on)</span>
      </label>
      {mission.manualOverride && (
        <p className="text-[10px] text-[var(--store-accent)]">Manual override — auto-replan paused</p>
      )}
      <p className="text-[10px] store-text-muted">Use toolbar <span className="text-[var(--store-accent)]">Edit flight path</span> to add/move waypoints on the map.</p>
      <button
        type="button"
        onClick={onReplan}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--store-line)] store-text-body hover:text-white text-[10px] font-semibold"
      >
        <RefreshCw className="w-3 h-3" /> Replan
      </button>
    </div>
  )
}
