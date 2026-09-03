import { describe, expect, it } from 'vitest'
import {
  EFFECTIVE_EARTH_RADIUS_M,
  azimuthStepDeg,
  curvatureDropM,
  planSweep,
  rayVisibility,
  viewshedQuality,
} from '@/lib/map/viewshed'

const STEP = 50
const flat = (n: number, h = 0) => Array<number>(n).fill(h)

describe('curvature', () => {
  it('drops ~589 m at 100 km on a 4/3 Earth', () => {
    // d^2 / 2R with R = 8,494,667 m. This is the drop at range d from the
    // emitter — not the midpoint bulge of a d-long path, which is a quarter of
    // it and the figure people usually quote by mistake.
    expect(curvatureDropM(100_000)).toBeGreaterThan(580)
    expect(curvatureDropM(100_000)).toBeLessThan(600)
  })

  it('is a quarter as much at half the range', () => {
    expect(curvatureDropM(50_000)).toBeCloseTo(curvatureDropM(100_000) / 4, 0)
  })

  it('is negligible at short range', () => {
    expect(curvatureDropM(1_000)).toBeLessThan(0.1)
  })

  it('uses the 4/3 effective radius by default', () => {
    expect(EFFECTIVE_EARTH_RADIUS_M).toBeCloseTo(6371000 * 4 / 3, 0)
  })
})

describe('ray visibility', () => {
  it('sees the whole ray over flat ground at short range', () => {
    const r = rayVisibility(flat(20), STEP, 0, { emitterMastM: 10 })
    expect(r.firstMaskM).toBeNull()
    expect(r.visibleLengthM).toBe(1000)
    expect(r.segments).toHaveLength(1)
  })

  it('masks dead ground behind a ridge', () => {
    // Ridge at 500 m, then low ground beyond.
    const heights = [...flat(9, 0), 120, ...flat(20, 0)]
    const r = rayVisibility(heights, STEP, 0, { emitterMastM: 10, targetAglM: 2 })
    expect(r.firstMaskM).not.toBeNull()
    expect(r.visibleLengthM).toBeLessThan(heights.length * STEP)
  })

  it('sees high ground again beyond a ridge — the case a single distance cannot express', () => {
    // Ridge at 500 m, dead ground, then a taller hill at 1500 m.
    const heights = [...flat(9, 0), 120, ...flat(19, 0), 400, ...flat(10, 400)]
    const r = rayVisibility(heights, STEP, 0, { emitterMastM: 10, targetAglM: 2 })
    const visibleRuns = r.segments.filter((s) => s.visible)
    expect(visibleRuns.length).toBeGreaterThan(1)
    // The far hill is visible even though ground before it is masked.
    expect(r.segments.some((s) => !s.visible && s.fromM < 1400)).toBe(true)
    expect(r.segments.some((s) => s.visible && s.fromM >= 1400)).toBe(true)
  })

  it('masks a distant target on flat ground through curvature alone', () => {
    // 200 km of dead-flat sea from a 10 m mast — the horizon must bite.
    const r = rayVisibility(flat(4000), 50, 0, { emitterMastM: 10, targetAglM: 2 })
    expect(r.firstMaskM).not.toBeNull()
    expect(r.firstMaskM!).toBeLessThan(200_000)
  })

  it('sees further from a higher mast', () => {
    const low = rayVisibility(flat(4000), 50, 0, { emitterMastM: 5, targetAglM: 2 })
    const high = rayVisibility(flat(4000), 50, 0, { emitterMastM: 30, targetAglM: 2 })
    expect(high.visibleLengthM).toBeGreaterThan(low.visibleLengthM)
  })

  it('sees a higher-flying target further', () => {
    const lowT = rayVisibility(flat(4000), 50, 0, { emitterMastM: 10, targetAglM: 2 })
    const highT = rayVisibility(flat(4000), 50, 0, { emitterMastM: 10, targetAglM: 300 })
    expect(highT.visibleLengthM).toBeGreaterThan(lowT.visibleLengthM)
  })
})

describe('unresolved terrain', () => {
  const withHoles = [...flat(5, 0), NaN, NaN, ...flat(10, 0)]

  it('blocks by default rather than claiming unproven coverage', () => {
    const r = rayVisibility(withHoles, STEP, 0, { unresolvedPolicy: 'block' })
    expect(r.unresolvedSamples).toBe(2)
    expect(r.firstMaskM).toBe(250)
    // Everything past the hole stays masked — the conservative choice.
    expect(r.segments.filter((s) => s.visible && s.fromM > 350)).toHaveLength(0)
  })

  it('carries the last resolved height when asked', () => {
    const r = rayVisibility(withHoles, STEP, 0, { unresolvedPolicy: 'carry', targetAglM: 2 })
    expect(r.unresolvedSamples).toBe(2)
    expect(r.visibleLengthM).toBeGreaterThan(0)
  })

  it("reproduces the old transparent behaviour under 'ignore'", () => {
    const r = rayVisibility(withHoles, STEP, 0, { unresolvedPolicy: 'ignore' })
    expect(r.firstMaskM).toBeNull()
  })

  it('always counts unresolved samples whatever the policy', () => {
    for (const p of ['block', 'carry', 'ignore'] as const) {
      expect(rayVisibility(withHoles, STEP, 0, { unresolvedPolicy: p }).unresolvedSamples).toBe(2)
    }
  })

  it('is deterministic — same input, same result', () => {
    const a = rayVisibility(withHoles, STEP, 0)
    const b = rayVisibility(withHoles, STEP, 0)
    expect(a.segments).toEqual(b.segments)
  })

  it('handles an empty ray', () => {
    const r = rayVisibility([], STEP, 0)
    expect(r.segments).toEqual([])
    expect(r.visibleLengthM).toBe(0)
    expect(r.firstMaskM).toBeNull()
  })
})

describe('azimuth resolution', () => {
  it('tightens the step as range grows', () => {
    expect(azimuthStepDeg(50_000)).toBeLessThan(azimuthStepDeg(5_000))
  })

  it('meets the requested spacing until the minimum-step clamp binds', () => {
    // At 10 km, 250 m spacing needs 1.43 deg — achievable.
    const near = 10_000
    const degNear = azimuthStepDeg(near, 250)
    expect(near * (degNear * Math.PI) / 180).toBeLessThanOrEqual(260)

    // At 50 km it would need 0.29 deg, below the 0.5 deg floor, so spacing
    // widens to ~436 m. The floor is deliberate: 0.5 deg is already 720 rays.
    const far = 50_000
    const degFar = azimuthStepDeg(far, 250)
    expect(degFar).toBe(0.5)
    expect(far * (degFar * Math.PI) / 180).toBeGreaterThan(260)
  })

  it('clamps so a long range cannot demand an unusable sweep', () => {
    expect(azimuthStepDeg(5_000_000)).toBeGreaterThanOrEqual(0.5)
    expect(azimuthStepDeg(10)).toBeLessThanOrEqual(5)
  })
})

describe('quality reporting', () => {
  it('flags a sweep with too much missing terrain', () => {
    const rays = [
      { segments: [], firstMaskM: null, visibleLengthM: 0, unresolvedSamples: 30, totalSamples: 100 },
      { segments: [], firstMaskM: null, visibleLengthM: 0, unresolvedSamples: 0, totalSamples: 100 },
    ]
    const q = viewshedQuality(rays)
    expect(q.unresolvedPct).toBe(15)
    expect(q.trustworthy).toBe(false)
  })

  it('passes a clean sweep', () => {
    const q = viewshedQuality([
      { segments: [], firstMaskM: null, visibleLengthM: 0, unresolvedSamples: 0, totalSamples: 500 },
    ])
    expect(q.trustworthy).toBe(true)
    expect(q.unresolvedPct).toBe(0)
  })
})

describe('validation against the standard radio horizon', () => {
  const flatSea = () => Array<number>(6000).fill(0)
  /** d_km = 4.12 * (sqrt(h1) + sqrt(h2)) for a 4/3 Earth, h in metres. */
  const referenceM = (h1: number, h2: number) => 4.12 * (Math.sqrt(h1) + Math.sqrt(h2)) * 1000

  const CASES: [number, number][] = [[10, 2], [30, 2], [10, 300], [100, 10]]

  it.each(CASES)('matches the reference formula for a %i m mast and %i m target', (h1, h2) => {
    const r = rayVisibility(flatSea(), 50, 0, { emitterMastM: h1, targetAglM: h2 })
    expect(r.firstMaskM).not.toBeNull()
    const errPct = Math.abs((r.firstMaskM! - referenceM(h1, h2)) / referenceM(h1, h2)) * 100
    // Sampled at 50 m steps, so agreement is limited by step size, not geometry.
    expect(errPct).toBeLessThan(1)
  })

  it('extends the horizon when a terrain tolerance is set, as documented', () => {
    const strict = rayVisibility(flatSea(), 50, 0, { emitterMastM: 10, targetAglM: 2 })
    const tolerant = rayVisibility(flatSea(), 50, 0, { emitterMastM: 10, targetAglM: 2, clearanceM: 5 })
    expect(tolerant.firstMaskM!).toBeGreaterThan(strict.firstMaskM!)
  })
})

describe('sweep budgeting', () => {
  it('stays inside the sample budget at long range', () => {
    const p = planSweep(50_000)
    expect(p.totalSamples).toBeLessThanOrEqual(60_000)
    expect(p.budgetLimited).toBe(true)
  })

  it('widens azimuth before coarsening radially', () => {
    // At 30 km the budget binds but azimuth still has room, so radial stays fine.
    const mid = planSweep(30_000)
    expect(mid.budgetLimited).toBe(true)
    expect(mid.azStepDeg).toBeGreaterThan(azimuthStepDeg(30_000))
    expect(mid.stepM).toBe(50)

    // At 50 km azimuth is already at its 5 degree ceiling, so radial must relax.
    const far = planSweep(50_000)
    expect(far.azStepDeg).toBe(5)
    expect(far.stepM).toBeGreaterThan(50)
  })

  it('buys real angular resolution at the ranges radars actually use', () => {
    // The legacy sweep was a fixed 5 degrees everywhere.
    expect(planSweep(10_000).azStepDeg).toBeLessThan(2)
    expect(planSweep(5_000).azStepDeg).toBeLessThan(3)
  })

  it('uses the ideal azimuth step when the budget allows', () => {
    const p = planSweep(5_000)
    expect(p.budgetLimited).toBe(false)
    expect(p.azStepDeg).toBeCloseTo(azimuthStepDeg(5_000), 6)
    expect(p.totalSamples).toBeLessThanOrEqual(60_000)
  })

  it('never proposes a sweep coarser than the legacy 5 degrees', () => {
    expect(planSweep(500_000).azStepDeg).toBeLessThanOrEqual(5)
  })

  it('respects a custom budget', () => {
    expect(planSweep(50_000, 10_000).totalSamples).toBeLessThanOrEqual(10_000)
  })
})
