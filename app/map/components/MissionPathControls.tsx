'use client'

import { RefreshCw, Radio, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PK_THRESHOLD_PCT } from '@/lib/map/mission-path-planner'
import type { PlacedUas } from '@/lib/map/types'

interface MissionPathControlsProps {
  uas: PlacedUas
  onReplan: () => void
  onClear: () => void
  onEmconChange: (enabled: boolean) => void
}

export function MissionPathControls({ uas, onReplan, onClear, onEmconChange }: MissionPathControlsProps) {
  const mission = uas.mission
  if (!mission) return null
  return (
    <div className="p-2.5 rounded-xl store-panel-inner border border-[var(--store-line)] text-[11px] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[var(--store-accent)] font-semibold text-[10px] tracking-wider uppercase">Mission path</span>
        <button type="button" onClick={onClear} className="store-text-muted hover:text-[var(--store-accent)]" title="Clear mission"><Trash2 className="w-3 h-3" /></button>
      </div>
      <p className="font-mono store-text-muted">{mission.goalKind.toUpperCase()} · {mission.totalDistance_km.toFixed(1)} km</p>
      <p className={cn('font-mono', mission.maxPk_pct >= PK_THRESHOLD_PCT ? 'text-[var(--store-accent)]' : 'store-text-body')}>Max Pk {mission.maxPk_pct}% {mission.pkThresholdExceeded ? '(≥20% flag)' : ''}</p>
      <p className="font-mono store-text-muted text-[10px]">{mission.pathMode} · {mission.waypoints.length} waypoints</p>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={mission.emcon} onChange={(e) => onEmconChange(e.target.checked)} className="rounded border-[var(--store-line)]" />
        <Radio className="w-3 h-3 text-[var(--store-accent)]" />
        <span className="store-text-body">EMCON (off = transit default)</span>
      </label>
      {mission.manualOverride && <p className="text-[10px] text-[var(--store-accent)]">Manual override — auto-replan paused</p>}
      <button type="button" onClick={onReplan} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--store-line)] store-text-body hover:text-white text-[10px] font-semibold">
        <RefreshCw className="w-3 h-3" /> Replan
      </button>
    </div>
  )
}
