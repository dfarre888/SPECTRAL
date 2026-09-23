'use client'

import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { frameAt, frameLabel, type TickFrame } from '@/lib/wopr/tick-history'

interface TickScrubberProps {
  frames: TickFrame[]
  index: number
  following: boolean
  onScrub: (index: number) => void
  onReturnToLive: () => void
}

export function TickScrubber({
  frames,
  index,
  following,
  onScrub,
  onReturnToLive,
}: TickScrubberProps) {
  const max = Math.max(0, frames.length - 1)
  const current = frameAt(frames, index)
  const disabled = frames.length < 2

  return (
    <div className="flex items-center gap-2 border-t border-[var(--store-line)] px-3 py-2">
      <button
        type="button"
        aria-label="Step back one tick"
        disabled={disabled || index <= 0}
        onClick={() => onScrub(index - 1)}
        className="glass-icon-btn h-8 w-8 shrink-0 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Step forward one tick"
        disabled={disabled || index >= max}
        onClick={() => onScrub(index + 1)}
        className="glass-icon-btn h-8 w-8 shrink-0 disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>

      <input
        type="range"
        min={0}
        max={max}
        value={Math.min(index, max)}
        disabled={disabled}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Scrub scenario history"
        className="mx-1 h-1 min-w-0 flex-1 cursor-pointer accent-[var(--wb-blue)] disabled:cursor-default disabled:opacity-30"
      />

      <span className="w-[150px] shrink-0 text-right font-mono text-[12px] tabular-nums store-text-muted">
        {disabled ? 'Awaiting ticks' : frameLabel(current)}
      </span>

      <button
        type="button"
        onClick={onReturnToLive}
        disabled={following}
        title={following ? 'Following the live stream' : 'Jump back to the latest tick'}
        className={clsx(
          'tag shrink-0',
          following ? 'green cursor-default' : 'amber',
        )}
      >
        <span
          aria-hidden
          className={clsx('h-1.5 w-1.5 rounded-full', following ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]')}
        />
        {following ? 'Live' : 'Replay: back to live'}
      </button>
    </div>
  )
}
