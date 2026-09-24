/**
 * Replay buffer for WOPR scenario ticks.
 *
 * Ticks arrive over SSE and were previously rendered and discarded, so the COP
 * could only ever show "now". Retaining them lets an instructor scrub back and
 * watch a side's picture fill in as sensors acquire: which is the clearest way
 * to show that detection, not truth, drives the decision.
 *
 * Pure data, no React, so the buffer semantics are testable under node.
 */

import type { TickRecord, TickResult, WorldState } from '@/lib/wopr/types'

export interface TickFrame {
  tick: TickResult
  receivedAt: string
  /** World state after this tick, when known (history loaded from the store). */
  world?: WorldState | null
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
  world?: WorldState | null,
): TickFrame[] {
  const last = frames[frames.length - 1]
  const frame: TickFrame = {
    tick,
    receivedAt: at.toISOString(),
    // A re-emitted turn (SSE after the POST reply) arrives without the world;
    // keep the one we already hold.
    world: world ?? (last && last.tick.turn === tick.turn ? last.world : undefined),
  }

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

/** True when the index is pinned to the newest frame: i.e. following live. */
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
  if (!frame) return 'No tick'
  return `T+${frame.tick.elapsed_min} min · turn ${frame.tick.turn}`
}

/** Running total of events up to and including a frame: the log as it stood then. */
export function eventsThrough(frames: readonly TickFrame[], index: number): string[] {
  const out: string[] = []
  for (let i = 0; i <= Math.min(index, frames.length - 1); i++) {
    out.push(...frames[i].tick.events)
  }
  return out
}

/** Frames from persisted turns, oldest first. */
export function framesFromRecords(records: readonly TickRecord[]): TickFrame[] {
  return [...records]
    .sort((a, b) => a.turn - b.turn)
    .map((r) => ({
      tick: r.tick,
      receivedAt: r.created_at ?? new Date(0).toISOString(),
      world: r.world_state ?? null,
    }))
    .slice(-MAX_FRAMES)
}

/**
 * Merge stored history under frames already received live. A live frame wins
 * for its turn (it is newer), but inherits the stored world state if it has none.
 */
export function mergeHistory(
  live: readonly TickFrame[],
  stored: readonly TickFrame[],
): TickFrame[] {
  const byTurn = new Map<number, TickFrame>()
  for (const f of stored) byTurn.set(f.tick.turn, f)
  for (const f of live) {
    const prev = byTurn.get(f.tick.turn)
    byTurn.set(f.tick.turn, { ...f, world: f.world ?? prev?.world ?? null })
  }
  return [...byTurn.values()].sort((a, b) => a.tick.turn - b.tick.turn).slice(-MAX_FRAMES)
}
