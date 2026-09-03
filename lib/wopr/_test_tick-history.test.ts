import { describe, expect, it } from 'vitest'
import {
  MAX_FRAMES,
  appendFrame,
  clampIndex,
  eventsThrough,
  frameAt,
  frameLabel,
  isLive,
  latestIndex,
  type TickFrame,
} from '@/lib/wopr/tick-history'
import type { TickResult } from '@/lib/wopr/types'

function tick(turn: number, over: Partial<TickResult> = {}): TickResult {
  return {
    elapsed_min: turn * 5,
    turn,
    red_picture: [],
    blue_picture: [],
    events: [`turn ${turn}`],
    propagation_refreshed: false,
    ...over,
  }
}

function build(turns: number[]): TickFrame[] {
  return turns.reduce<TickFrame[]>((acc, t) => appendFrame(acc, tick(t)), [])
}

describe('tick history buffer', () => {
  it('appends successive turns in order', () => {
    const frames = build([1, 2, 3])
    expect(frames).toHaveLength(3)
    expect(frames.map((f) => f.tick.turn)).toEqual([1, 2, 3])
  })

  it('replaces rather than appends when the stream re-emits a turn', () => {
    let frames = build([1, 2])
    frames = appendFrame(frames, tick(2, { events: ['revised'] }))
    expect(frames).toHaveLength(2)
    expect(frames[1].tick.events).toEqual(['revised'])
  })

  it('bounds the buffer at MAX_FRAMES, dropping the oldest', () => {
    const turns = Array.from({ length: MAX_FRAMES + 20 }, (_, i) => i + 1)
    const frames = build(turns)
    expect(frames).toHaveLength(MAX_FRAMES)
    expect(frames[0].tick.turn).toBe(21)
    expect(frames[frames.length - 1].tick.turn).toBe(MAX_FRAMES + 20)
  })

  it('reads frames by index and rejects out-of-range', () => {
    const frames = build([1, 2, 3])
    expect(frameAt(frames, 1)?.tick.turn).toBe(2)
    expect(frameAt(frames, -1)).toBeNull()
    expect(frameAt(frames, 9)).toBeNull()
    expect(latestIndex(frames)).toBe(2)
  })

  it('treats only the newest frame as live', () => {
    const frames = build([1, 2, 3])
    expect(isLive(frames, 2)).toBe(true)
    expect(isLive(frames, 1)).toBe(false)
    // An empty buffer is live by definition — nothing to scrub back to.
    expect(isLive([], 0)).toBe(true)
  })

  it('clamps an index that a shrinking buffer left out of range', () => {
    const frames = build([1, 2, 3])
    expect(clampIndex(frames, 99)).toBe(2)
    expect(clampIndex(frames, -5)).toBe(0)
    expect(clampIndex([], 3)).toBe(0)
  })

  it('accumulates the event log as it stood at a frame', () => {
    const frames = build([1, 2, 3])
    expect(eventsThrough(frames, 1)).toEqual(['turn 1', 'turn 2'])
    expect(eventsThrough(frames, 99)).toEqual(['turn 1', 'turn 2', 'turn 3'])
  })

  it('labels frames for the scrubber readout', () => {
    const frames = build([4])
    expect(frameLabel(frames[0])).toBe('T+20 min · turn 4')
    expect(frameLabel(null)).toBe('—')
  })
})
