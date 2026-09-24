import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARED,
  DIGITAL_TASKING,
  OUTCOME_LABEL,
  VOICE_NET,
  mulberry32,
  percentile,
  runFiresLoop,
  runFiresLoopBatch,
  type SharedParams,
  type TargetOutcome,
} from '@/lib/wopr/fires-loop'

const shared = (over: Partial<SharedParams> = {}): SharedParams => ({
  ...structuredClone(DEFAULT_SHARED),
  ...over,
})

describe('percentile', () => {
  it('interpolates linearly and handles edge cases', () => {
    expect(percentile([], 50)).toBeNull()
    expect(percentile([7], 90)).toBe(7)
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5)
    expect(percentile([10, 0, 5], 0)).toBe(0)
    expect(percentile([10, 0, 5], 100)).toBe(10)
    expect(percentile([0, 10], 90)).toBeCloseTo(9)
  })
})

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const xs = Array.from({ length: 200 }, () => a())
    expect(xs).toEqual(Array.from({ length: 200 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(mulberry32(43)()).not.toBe(xs[0])
  })
})

describe('runFiresLoop', () => {
  it('gives identical results for identical inputs and seed', () => {
    const a = runFiresLoop(shared(), VOICE_NET.c2, 123)
    const b = runFiresLoop(shared(), VOICE_NET.c2, 123)
    expect(a).toEqual(b)
    const c = runFiresLoop(shared(), VOICE_NET.c2, 124)
    expect(c.targets.map((t) => t.appearAt)).not.toEqual(a.targets.map((t) => t.appearAt))
  })

  it('shows both presets the same targets (common random numbers)', () => {
    const v = runFiresLoop(shared(), VOICE_NET.c2, 9)
    const d = runFiresLoop(shared(), DIGITAL_TASKING.c2, 9)
    expect(d.targets.map((t) => [t.appearAt, t.escapeAt, t.x, t.depth])).toEqual(
      v.targets.map((t) => [t.appearAt, t.escapeAt, t.x, t.depth]),
    )
  })

  it('accounts for every target exactly once', () => {
    const r = runFiresLoop(shared({ arrivalsPerHour: 20 }), VOICE_NET.c2, 5)
    const outcomes = Object.keys(OUTCOME_LABEL) as TargetOutcome[]
    const counted = outcomes.reduce((s, k) => s + r.targets.filter((t) => t.outcome === k).length, 0)
    expect(counted).toBe(r.targets.length)
    for (const t of r.targets) {
      if (t.outcome === 'destroyed') {
        expect(t.destroyedAt).not.toBeNull()
        expect(t.destroyedAt!).toBeLessThan(t.escapeAt)
      }
      if (t.detectAt !== null) expect(t.detectAt).toBeGreaterThanOrEqual(t.appearAt)
    }
  })

  it('keeps stage times in order for engaged targets', () => {
    const r = runFiresLoop(shared(), DIGITAL_TASKING.c2, 77)
    for (const t of r.targets) {
      if (t.firstEffectAt === null) continue
      expect(t.detectAt).not.toBeNull()
      expect(t.nominatedAt!).toBeGreaterThanOrEqual(t.detectAt!)
      expect(t.approvalStartAt!).toBeGreaterThanOrEqual(t.nominatedAt!)
      expect(t.approvedAt!).toBeGreaterThanOrEqual(t.approvalStartAt!)
      expect(t.firstEffectAt).toBeGreaterThanOrEqual(t.approvedAt!)
      expect(t.sensorToEffectMin).toBeCloseTo(t.firstEffectAt - t.detectAt!)
    }
  })

  it('never launches more munitions than shooters hold', () => {
    const s = shared({ arrivalsPerHour: 40 })
    s.fpv = { ...s.fpv, munitionsEach: 2 }
    s.loiter = { ...s.loiter, munitionsEach: 1 }
    s.artillery = { ...s.artillery, munitionsEach: 3 }
    const r = runFiresLoop(s, DIGITAL_TASKING.c2, 3)
    const byKind = (k: string) => r.shooters.filter((x) => x.kind === k).reduce((n, x) => n + x.launches, 0)
    expect(byKind('fpv')).toBeLessThanOrEqual(s.fpv.count * 2)
    expect(byKind('loiter')).toBeLessThanOrEqual(s.loiter.count * 1)
    expect(byKind('artillery')).toBeLessThanOrEqual(s.artillery.count * 3)
    for (const x of r.shooters) expect(x.busyMin).toBeLessThanOrEqual(s.windowMin + 1e-9)
  })

  it('with no shooters, nothing is destroyed and approved targets escape waiting', () => {
    const s = shared()
    s.fpv = { ...s.fpv, count: 0 }
    s.loiter = { ...s.loiter, count: 0 }
    s.artillery = { ...s.artillery, count: 0 }
    const r = runFiresLoop(s, DIGITAL_TASKING.c2, 11)
    expect(r.targets.some((t) => t.outcome === 'destroyed')).toBe(false)
    expect(r.targets.some((t) => t.outcome === 'escaped_awaiting_shooter')).toBe(true)
  })

  it('a single serial approval lane queues under load; parallel lanes do not', () => {
    const s = shared({ arrivalsPerHour: 30 })
    const serial = runFiresLoop(s, { ...VOICE_NET.c2, approveMin: 4 }, 21)
    const parallel = runFiresLoop(s, { ...VOICE_NET.c2, approveMin: 4, approvalLanes: 50, assignUsesApprovalNet: false }, 21)
    expect(serial.approvalQueuePeak).toBeGreaterThan(1)
    expect(serial.approvalWaitMeanMin!).toBeGreaterThan(parallel.approvalWaitMeanMin ?? 0)
    expect(parallel.approvalWaitMeanMin ?? 0).toBeCloseTo(0, 6)
  })

  it('produces no targets when the arrival rate is zero', () => {
    const r = runFiresLoop(shared({ arrivalsPerHour: 0 }), VOICE_NET.c2, 1)
    expect(r.targets).toHaveLength(0)
    expect(r.approvalQueuePeak).toBe(0)
  })
})

describe('runFiresLoopBatch', () => {
  it('is deterministic and reports ordered percentiles', () => {
    const a = runFiresLoopBatch(shared(), VOICE_NET.c2, { seed: 1, runs: 20 })
    const b = runFiresLoopBatch(shared(), VOICE_NET.c2, { seed: 1, runs: 20 })
    expect(a.sensorToEffect).toEqual(b.sensorToEffect)
    expect(a.sensorToEffect.p90!).toBeGreaterThanOrEqual(a.sensorToEffect.median!)
    expect(a.destroyed + a.escaped).toBeCloseTo(a.appeared)
    for (const u of Object.values(a.utilisation)) {
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(1)
    }
  })

  it('with default assumptions, digital tasking closes the loop faster and engages more', () => {
    const voice = runFiresLoopBatch(shared(), VOICE_NET.c2, { seed: 2026, runs: 60 })
    const digital = runFiresLoopBatch(shared(), DIGITAL_TASKING.c2, { seed: 2026, runs: 60 })
    expect(digital.sensorToEffect.median!).toBeLessThan(voice.sensorToEffect.median!)
    expect(digital.sensorToEffect.p90!).toBeLessThan(voice.sensorToEffect.p90!)
    expect(digital.destroyed).toBeGreaterThan(voice.destroyed)
    expect(digital.approvalQueuePeak).toBeLessThan(voice.approvalQueuePeak)
  })

  it('clamps the replication count', () => {
    expect(runFiresLoopBatch(shared(), VOICE_NET.c2, { seed: 1, runs: 0 }).runs).toBe(1)
    expect(runFiresLoopBatch(shared({ arrivalsPerHour: 1 }), VOICE_NET.c2, { seed: 1, runs: 5000 }).runs).toBe(1000)
  })
})
