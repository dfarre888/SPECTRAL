'use client'

import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react'
import { frameAt, frameLabel, type TickFrame } from '@/lib/wopr/tick-history'

interface TickScrubberProps {
  frames: TickFrame[]
  index: number
  following: boolean
  onScrub: (index: number) => void
  onReturnToLive: () => void
  /** Fork the scenario at the frame under the playhead. Omit to hide the action. */
  onBranch?: (frame: TickFrame) => void
  /** Why branching is unavailable (shown as the button's title and disables it). */
  branchDisabledReason?: string | null
  branching?: boolean
}

export function TickScrubber({
  frames,
  index,
  following,
  onScrub,
  onReturnToLive,
  onBranch,
  branchDisabledReason,
  branching = false,
}: TickScrubberProps) {
  const max = Math.max(0, frames.length - 1)
  const current = frameAt(frames, index)
  const disabled = frames.length < 2
  const at = current ? `T+${current.tick.elapsed_min}` : null
  const branchBlocked = Boolean(branchDisabledReason) || !current || branching

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--store-line)] px-3 py-2">
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
        className="mx-1 h-1 min-w-[120px] flex-1 cursor-pointer accent-[var(--wb-blue)] disabled:cursor-default disabled:opacity-30"
      />

      <span className="w-[150px] shrink-0 text-right font-mono text-[12px] tabular-nums store-text-muted">
        {frames.length === 0 ? 'Awaiting ticks' : frameLabel(current)}
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

      {onBranch ? (
        <button
          type="button"
          onClick={() => current && onBranch(current)}
          disabled={branchBlocked}
          title={
            branchDisabledReason ??
            (current
              ? `Fork this scenario at ${at} min into a new scenario that keeps the history to here`
              : 'Advance a tick first')
          }
          className="btn-glass sm shrink-0 !min-h-[30px] !px-3 !text-[12px] disabled:opacity-40"
          data-testid="branch-from-turn"
        >
          <GitBranch className="h-3.5 w-3.5" aria-hidden />
          {branching ? 'Branching…' : at ? `Branch from ${at}` : 'Branch'}
        </button>
      ) : null}
    </div>
  )
}
