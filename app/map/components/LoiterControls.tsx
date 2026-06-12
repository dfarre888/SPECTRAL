'use client'

import { MapPin, X } from 'lucide-react'
import { formatHHMM } from '@/lib/map/format'
import type { PlacedUas } from '@/lib/map/types'

interface LoiterControlsProps {
  uas: PlacedUas
  loiterPlacing: boolean
  onPlaceLoiter: () => void
  onClearLoiter: () => void
}

export function LoiterControls({
  uas,
  loiterPlacing,
  onPlaceLoiter,
  onClearLoiter,
}: LoiterControlsProps) {
  if (uas.loiter) {
    return (
      <div className="mt-2 p-2 rounded border border-border bg-surf2 text-[10px] font-mono space-y-1">
        <div className="flex items-center justify-between text-t-secondary">
          <span className="text-cyan">LOITER ACTIVE</span>
          <button
            type="button"
            onClick={onClearLoiter}
            className="text-t-muted hover:text-orange"
            title="Clear loiter plan"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <p>Transit: {formatHHMM(uas.loiter.transitTime_min)}</p>
        <p>On station: {formatHHMM(uas.loiter.timeOnStation_min)}</p>
        <p>RTH: {formatHHMM(uas.loiter.returnTime_min)}</p>
        {uas.loiter.exceedsEndurance && (
          <p className="text-orange font-semibold">⚠ Exceeds endurance envelope</p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      {loiterPlacing && (
        <p className="text-[10px] font-mono text-cyan animate-pulse">
          Click map to set loiter point
        </p>
      )}
      <button
        type="button"
        onClick={onPlaceLoiter}
        className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border text-[10px] font-mono transition-colors ${
          loiterPlacing
            ? 'border-cyan bg-cyan/20 text-cyan'
            : 'border-cyan/30 bg-cyan/5 text-cyan hover:bg-cyan/10'
        }`}
      >
        <MapPin className="w-3 h-3" />
        Place Loiter
      </button>
    </div>
  )
}
