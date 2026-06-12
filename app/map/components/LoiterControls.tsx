'use client'

import { MapPin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
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
      <div className="p-2.5 rounded-xl store-panel-inner border border-[var(--store-line)] text-[11px] space-y-1">
        <div className="flex items-center justify-between store-text-body">
          <span className="text-[var(--store-accent)] font-semibold text-[10px] tracking-wider uppercase">
            Loiter active
          </span>
          <button
            type="button"
            onClick={onClearLoiter}
            className="store-text-muted hover:text-[var(--store-accent)]"
            title="Clear loiter plan"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <p className="font-mono store-text-muted">Transit {formatHHMM(uas.loiter.transitTime_min)}</p>
        <p className="font-mono store-text-muted">On station {formatHHMM(uas.loiter.timeOnStation_min)}</p>
        <p className="font-mono store-text-muted">RTH {formatHHMM(uas.loiter.returnTime_min)}</p>
        {uas.loiter.exceedsEndurance && (
          <p className="text-[var(--store-accent)] font-semibold text-[11px]">
            Exceeds endurance envelope
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {loiterPlacing && (
        <p className="text-[11px] text-[var(--store-accent)] animate-pulse">
          Click the map to set loiter point
        </p>
      )}
      <button
        type="button"
        onClick={onPlaceLoiter}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border',
          loiterPlacing
            ? 'nav-item-active'
            : 'store-panel-inner store-text-body hover:text-white border-[var(--store-line)]',
        )}
      >
        <MapPin className="w-3.5 h-3.5" />
        Place loiter
      </button>
    </div>
  )
}
