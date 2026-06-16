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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 pointer-events-auto">
      <div className="w-full max-w-sm rounded-2xl store-panel shadow-xl border border-[var(--store-line)] p-5 space-y-4">
        <div>
          <p className="text-[10px] store-text-muted uppercase tracking-wider">Mission planning</p>
          <p className="text-sm font-semibold text-white mt-1">{uas.asset.name} placed</p>
          <p className="text-[11px] store-text-body mt-1">Select mission objective type, then click the map.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onSelect('target')} className="store-btn-primary flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold">
            <Crosshair className="w-3.5 h-3.5" /> Target
          </button>
          <button type="button" onClick={() => onSelect('aoi')} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border border-[var(--store-line)] store-panel-inner store-text-body hover:text-white">
            <MapPin className="w-3.5 h-3.5 text-[var(--store-accent)]" /> AOI
          </button>
        </div>
        <button type="button" onClick={onDismiss} className="w-full text-[11px] store-text-muted hover:text-white">Skip for now</button>
      </div>
    </div>
  )
}
