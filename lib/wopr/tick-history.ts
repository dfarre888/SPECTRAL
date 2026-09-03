/**
 * Replay buffer for WOPR scenario ticks.
 *
 * Ticks arrive over SSE and were previously rendered and discarded, so the COP
 * could only ever show "now". Retaining them lets an instructor scrub back and
 * watch a side's picture fill in as sensors acquire — which is the clearest way
 * to show that detection, not truth, drives the decision.
 *
 * Pure data, no React, so the buffer semantics are testable under node.
 */

import type { TickResult } from '@/lib/wopr/types'

export interface TickFrame {
  tick: TickResult
  receivedAt: string
}

/**
 * Cap on retained frames. A scenario ticking every few seconds for an hour
 * stays well inside this, and the bound stops a long-running demo growing
 * without limit.
 */
export const MAX_FRAMES = 240

export function appendFrame(
  frames: readonly TickFrame[],
  tick: TickResult,
  at: Date = new Date(),
): TickFrame[] {
  const frame: TickFrame = { tick, receivedAt: at.toISOString() }
  const last = frames[frames.length - 1]

  // The stream can re-emit the current turn (reconnect, keep-alive). Replace
  // rather than append so the scrubber does not fill with duplicates.
  const next =
    last && last.tick.turn === tick.turn
      ? [...frames.slice(0, -1), frame]
      : [...frames, frame]

  return next.length > MAX_FRAMES ? next.slice(next.length - MAX_FRAMES) : next
}

export function frameAt(frames: readonly TickFrame[], index: number): TickFrame | null {
  if (index < 0 || index >= frames.length) return null
  return frames[index]
}

export function latestIndex(frames: readonly TickFrame[]): number {
  return frames.length - 1
}

/** True when the index is pinned to the newest frame — i.e. following live. */
export function isLive(frames: readonly TickFrame[], index: number): boolean {
  return frames.length === 0 || index >= frames.length - 1
}

/**
 * Clamp a requested index into range, tolerating a shrinking buffer after the
 * MAX_FRAMES cap drops old frames.
 */
export function clampIndex(frames: readonly TickFrame[], index: number): number {
  if (frames.length === 0) return 0
  return Math.min(Math.max(0, index), frames.length - 1)
}

export function frameLabel(frame: TickFrame | null): string {
  if (!frame) return '—'
  return `T+${frame.tick.elapsed_min} min · turn ${frame.tick.turn}`
}

/** Running total of events up to and including a frame — the log as it stood then. */
export function eventsThrough(frames: readonly TickFrame[], index: number): string[] {
  const out: string[] = []
  for (let i = 0; i <= Math.min(index, frames.length - 1); i++) {
    out.push(...frames[i].tick.events)
  }
  return out
}
