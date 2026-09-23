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
    <div className="p-2.5 rounded-xl border border-[var(--store-line)] bg-[rgba(255,255,255,0.02)] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-[var(--store-ink)]">Mission path</span>
        <button
          type="button"
          onClick={onClear}
          className="glass-icon-btn !w-7 !h-7 !rounded-lg hover:!text-[var(--wb-red)]"
          title="Clear mission"
          aria-label="Clear mission"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="font-mono text-[12px] store-text-body">
        {mission.goalKind.toUpperCase()} · {mission.totalDistance_km.toFixed(1)} km
      </p>

      <div className="seg sm w-full" role="group" aria-label="Route objective">
        {(['combined', 'pd', 'pk'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={objective === mode}
            onClick={() => onRouteObjectiveChange(mode)}
            className="flex-1 justify-center"
            title={mode === 'combined' ? 'Minimise Pk and Pd' : mode === 'pd' ? 'Minimise detection' : 'Minimise kill'}
          >
            {mode === 'combined' ? 'Both' : mode === 'pd' ? 'Pd' : 'Pk'}
          </button>
        ))}
      </div>

      <dl className="font-mono text-[12px] space-y-0.5">
        <div className="flex justify-between gap-2">
          <dt className="font-sans store-text-body">{primaryMetric.label}</dt>
          <dd
            className={cn(
              'tabular-nums text-right',
              primaryMetric.value >= primaryMetric.threshold ? 'text-[var(--wb-blue)]' : 'text-[var(--store-ink)]',
            )}
          >
            {primaryMetric.value}% {primaryMetric.flag ? `(flag at ${primaryMetric.threshold}%)` : ''}
          </dd>
        </div>
        <p className="store-text-muted text-[11.5px]">
          {objective === 'combined'
            ? `Pk ${mission.maxPk_pct}% · Pd ${mission.maxPd_pct}% · exp ${mission.pkExposure_km.toFixed(1)}/${mission.pdExposure_km.toFixed(1)} km`
            : objective === 'pd'
              ? `Pk ${mission.maxPk_pct}% · exposure ${mission.pdExposure_km.toFixed(1)} km`
              : `Pd ${mission.maxPd_pct}% · exposure ${mission.pkExposure_km.toFixed(1)} km`}
        </p>
        <p className="store-text-muted text-[11.5px]">
          {mission.pathMode} · {mission.waypoints.length} waypoints
        </p>
      </dl>

      <label className="flex items-center gap-2 cursor-pointer text-[12px]">
        <input
          type="checkbox"
          checked={mission.emcon}
          onChange={(e) => onEmconChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#2997FF]"
        />
        <Radio className="w-3.5 h-3.5 store-text-muted" />
        <span className="store-text-body">EMCON (reduces Pd when on)</span>
      </label>
      {mission.manualOverride && (
        <p className="text-[12px] text-[#6CB8FF]">Manual override: auto-replan paused</p>
      )}
      <p className="text-[11.5px] store-text-muted leading-snug">
        Use <span className="store-text-body">Edit flight path</span> in the laydown bar to add or move waypoints on the map.
      </p>
      <button type="button" onClick={onReplan} className="btn-glass w-full !min-h-8 !text-[12px]">
        <RefreshCw className="w-3.5 h-3.5" /> Replan
      </button>
    </div>
  )
}
