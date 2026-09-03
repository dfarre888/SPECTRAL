'use client'

import { clsx } from 'clsx'
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
    <div className="flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg store-panel-inner">
      <button
        type="button"
        aria-label="Step back one tick"
        disabled={disabled || index <= 0}
        onClick={() => onScrub(index - 1)}
        className="w-6 h-6 shrink-0 rounded flex items-center justify-center store-text-body disabled:opacity-30 hover:bg-[var(--store-surface-2)]"
      >
        ◀
      </button>
      <button
        type="button"
        aria-label="Step forward one tick"
        disabled={disabled || index >= max}
        onClick={() => onScrub(index + 1)}
        className="w-6 h-6 shrink-0 rounded flex items-center justify-center store-text-body disabled:opacity-30 hover:bg-[var(--store-surface-2)]"
      >
        ▶
      </button>

      <input
        type="range"
        min={0}
        max={max}
        value={Math.min(index, max)}
        disabled={disabled}
        onChange={(e) => onScrub(Number(e.target.value))}
        aria-label="Scrub scenario history"
        className="flex-1 min-w-0 accent-[var(--store-accent)] h-1 disabled:opacity-30"
      />

      <span className="text-[10px] font-mono store-text-muted tabular-nums shrink-0 w-[128px] text-right">
        {disabled ? 'awaiting ticks…' : frameLabel(current)}
      </span>

      <button
        type="button"
        onClick={onReturnToLive}
        disabled={following}
        title={following ? 'Following the live stream' : 'Jump back to the latest tick'}
        className={clsx(
          'shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors',
          following
            ? 'border-[rgba(74,222,128,0.35)] text-[var(--store-success)] bg-[rgba(74,222,128,0.10)] cursor-default'
            : 'border-[var(--store-accent-border)] text-[var(--store-accent)] bg-[var(--store-accent)]/10 hover:bg-[var(--store-accent)]/20',
        )}
      >
        {following ? '● LIVE' : 'REPLAY → live'}
      </button>
    </div>
  )
}
