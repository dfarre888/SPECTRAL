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
      <div className="p-2.5 rounded-xl border border-[var(--store-line)] bg-[rgba(255,255,255,0.02)] space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-[var(--store-ink)]">Loiter active</span>
          <button
            type="button"
            onClick={onClearLoiter}
            className="glass-icon-btn !w-7 !h-7 !rounded-lg"
            title="Clear loiter plan"
            aria-label="Clear loiter plan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <dl className="font-mono text-[12px]">
          <div className="flex justify-between gap-2">
            <dt className="font-sans store-text-body">Transit</dt>
            <dd className="tabular-nums text-[var(--store-ink)]">{formatHHMM(uas.loiter.transitTime_min)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="font-sans store-text-body">On station</dt>
            <dd className="tabular-nums text-[var(--store-ink)]">{formatHHMM(uas.loiter.timeOnStation_min)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="font-sans store-text-body">Return to home</dt>
            <dd className="tabular-nums text-[var(--store-ink)]">{formatHHMM(uas.loiter.returnTime_min)}</dd>
          </div>
        </dl>
        {uas.loiter.exceedsEndurance && (
          <p className="text-[12px] font-semibold text-[#FCD34D]">Exceeds endurance envelope</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {loiterPlacing && (
        <p className="text-[12px] text-[#6CB8FF]">Click the map to set the loiter point</p>
      )}
      <button
        type="button"
        onClick={onPlaceLoiter}
        aria-pressed={loiterPlacing}
        className={cn('btn-glass w-full !min-h-8 !text-[12px]', loiterPlacing && 'primary')}
      >
        <MapPin className="w-3.5 h-3.5" />
        Place loiter
      </button>
    </div>
  )
}
