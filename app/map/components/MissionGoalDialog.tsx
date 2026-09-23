'use client'

import { Crosshair, MapPin } from 'lucide-react'
import type { PlacedUas } from '@/lib/map/types'

interface MissionGoalDialogProps {
  uas: PlacedUas
  onSelect: (kind: 'target' | 'aoi') => void
  onDismiss: () => void
}

export function MissionGoalDialog({ uas, onSelect, onDismiss }: MissionGoalDialogProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 pointer-events-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-goal-title"
        className="glass-popover w-full max-w-sm p-5 space-y-4"
      >
        <div>
          <p className="text-[12px] store-text-muted">Mission planning</p>
          <p id="mission-goal-title" className="text-[15px] font-semibold text-[var(--store-ink)] mt-1 leading-snug">
            {uas.asset.name} placed
          </p>
          <p className="text-[13px] store-text-body mt-1.5">Choose the mission objective, then click the map.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onSelect('target')} className="btn-glass primary">
            <Crosshair className="w-4 h-4" /> Target
          </button>
          <button type="button" onClick={() => onSelect('aoi')} className="btn-glass">
            <MapPin className="w-4 h-4" /> AOI
          </button>
        </div>
        <button type="button" onClick={onDismiss} className="fc-action w-full justify-center">
          Skip for now
        </button>
      </div>
    </div>
  )
}
