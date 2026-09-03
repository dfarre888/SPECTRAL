import { describe, expect, it } from 'vitest'
import {
  bearingDeg,
  dopplerFactor,
  hazardRate,
  haversineM,
  planThreatRoute,
  rangeFactor,
  scoreRoute,
  type ThreatEmitter,
} from '@/lib/map/threat-route'

const threat = (over: Partial<ThreatEmitter> & Pick<ThreatEmitter, 'id' | 'lon' | 'lat'>): ThreatEmitter => ({
  label: over.id,
  detectionRangeM: 60_000,
  engagementRangeM: 40_000,
  pk: 0.6,
  dopplerNotch: true,
  notchHalfWidthDeg: 12,
  engagementsPerMin: 2,
  confidence: 'osint',
  ...over,
})

describe('geometry', () => {
  it('measures distance sensibly', () => {
    // ~111 km per degree of latitude.
    const d = haversineM({ lon: 0, lat: 0 }, { lon: 0, lat: 1 })
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })

  it('gives north as 0 and east as 90', () => {
    expect(bearingDeg({ lon: 0, lat: 0 }, { lon: 0, lat: 1 })).toBeCloseTo(0, 1)
    expect(bearingDeg({ lon: 0, lat: 0 }, { lon: 1, lat: 0 })).toBeCloseTo(90, 1)
  })
})

describe('doppler notch', () => {
  it('rejects a target flying broadside', () => {
    expect(dopplerFactor(90, 12)).toBeCloseTo(0, 3)
  })

  it('sees a target closing head-on', () => {
    expect(dopplerFactor(0, 12)).toBeCloseTo(1, 3)
    expect(dopplerFactor(180, 12)).toBeCloseTo(1, 3)
  })

  it('has skirts rather than a cliff edge', () => {
    const inNotch = dopplerFactor(88, 12)
    const nearEdge = dopplerFactor(80, 12)
    const outside = dopplerFactor(60, 12)
    expect(inNotch).toBeLessThan(nearEdge)
    expect(nearEdge).toBeLessThan(outside)
  })

  it('widens with the notch parameter', () => {
    expect(dopplerFactor(80, 30)).toBeLessThan(dopplerFactor(80, 5))
  })

  it('is disabled by a zero-width notch', () => {
    expect(dopplerFactor(90, 0)).toBe(1)
  })
})

describe('range factor', () => {
  it('is zero at and beyond the detection envelope', () => {
    expect(rangeFactor(60_000, 60_000)).toBe(0)
    expect(rangeFactor(80_000, 60_000)).toBe(0)
  })

  it('is strongest close in and falls with range', () => {
    expect(rangeFactor(1_000, 60_000)).toBeGreaterThan(rangeFactor(50_000, 60_000))
  })
})

describe('hazard rate', () => {
  const t = threat({ id: 'sam', lon: 0, lat: 0 })

  it('is zero outside detection range', () => {
    expect(hazardRate({ lon: 2, lat: 0 }, 90, [t])).toBe(0)
  })

  it('is zero inside detection but outside engagement range', () => {
    // ~50 km east: detected, not engageable.
    const p = { lon: 0.45, lat: 0 }
    expect(haversineM(p, { lon: 0, lat: 0 })).toBeGreaterThan(40_000)
    expect(hazardRate(p, 270, [t])).toBe(0)
  })

  it('is non-zero when closing inside engagement range', () => {
    expect(hazardRate({ lon: 0.2, lat: 0 }, 270, [t])).toBeGreaterThan(0)
  })

  it('drops in the notch — the reason routes bend', () => {
    const p = { lon: 0.2, lat: 0 }
    const closing = hazardRate(p, 270, [t]) // straight at the emitter
    const tangential = hazardRate(p, 0, [t]) // flying across its face
    expect(tangential).toBeLessThan(closing)
  })

  it('is zero where terrain masks the emitter', () => {
    const p = { lon: 0.2, lat: 0 }
    expect(hazardRate(p, 270, [t], () => true)).toBe(0)
  })

  it('sums independent emitters', () => {
    const two = hazardRate({ lon: 0.2, lat: 0 }, 270, [t, threat({ id: 's2', lon: 0.4, lat: 0 })])
    const one = hazardRate({ lon: 0.2, lat: 0 }, 270, [t])
    expect(two).toBeGreaterThan(one)
  })
})

describe('route scoring', () => {
  it('turns hazard into a survival probability', () => {
    const r = scoreRoute(
      [{ lon: -0.5, lat: 0 }, { lon: 0.5, lat: 0 }],
      [threat({ id: 'sam', lon: 0, lat: 0 })],
      { speedMps: 60, gridStepM: 2000, maxDetourFactor: 2 },
    )
    expect(r.cumulativeHazard).toBeGreaterThan(0)
    expect(r.survivalProbability).toBeLessThan(1)
    expect(r.survivalProbability).toBeCloseTo(Math.exp(-r.cumulativeHazard), 6)
  })

  it('reports full survival through empty airspace', () => {
    const r = scoreRoute([{ lon: 0, lat: 0 }, { lon: 1, lat: 0 }], [], DEFAULT_OPTS)
    expect(r.cumulativeHazard).toBe(0)
    expect(r.survivalProbability).toBe(1)
    expect(r.penetratedThreatIds).toEqual([])
    // No Pk was consulted, so the route claims no provenance.
    expect(r.confidence).toBeNull()
  })

  it('takes the weakest provenance among threats it actually flew through', () => {
    const r = scoreRoute(
      [{ lon: -0.3, lat: 0 }, { lon: 0.3, lat: 0 }],
      [
        threat({ id: 'acc', lon: 0, lat: 0, confidence: 'accredited' }),
        threat({ id: 'est', lon: 0.1, lat: 0, confidence: 'estimated' }),
      ],
      DEFAULT_OPTS,
    )
    expect(r.confidence).toBe('estimated')
  })
})

const DEFAULT_OPTS = { speedMps: 60, gridStepM: 2000, maxDetourFactor: 2 }

describe('route planning', () => {
  const start = { lon: -0.8, lat: 0 }
  const objective = { lon: 0.8, lat: 0 }

  it('flies direct through empty airspace', () => {
    const r = planThreatRoute(start, objective, [], DEFAULT_OPTS)
    expect(r.waypoints).toHaveLength(2)
    expect(r.detourFactor).toBeCloseTo(1, 3)
  })

  it('bends around a threat sitting on the direct line', () => {
    const threats = [threat({ id: 'sam', lon: 0, lat: 0 })]
    const direct = scoreRoute([start, objective], threats, DEFAULT_OPTS)
    const planned = planThreatRoute(start, objective, threats, { ...DEFAULT_OPTS, gridStepM: 8000 })

    expect(planned.cumulativeHazard).toBeLessThan(direct.cumulativeHazard)
    expect(planned.survivalProbability).toBeGreaterThan(direct.survivalProbability)
    expect(planned.waypoints.length).toBeGreaterThan(2)
  })

  it('keeps the detour inside the allowance', () => {
    const planned = planThreatRoute(
      start,
      objective,
      [threat({ id: 'sam', lon: 0, lat: 0 })],
      { ...DEFAULT_OPTS, gridStepM: 8000, maxDetourFactor: 1.4 },
    )
    expect(planned.detourFactor).toBeLessThanOrEqual(1.4)
  })

  it('accepts exposure when the objective is inside the threat ring', () => {
    // Objective sits on top of the SAM — there is no safe route, only a least-bad one.
    const threats = [threat({ id: 'sam', lon: 0, lat: 0 })]
    const planned = planThreatRoute(start, { lon: 0, lat: 0 }, threats, { ...DEFAULT_OPTS, gridStepM: 8000 })
    expect(planned.cumulativeHazard).toBeGreaterThan(0)
    expect(planned.penetratedThreatIds).toContain('sam')
  })

  it('returns the direct leg when bending would buy nothing', () => {
    // Threat far off the axis contributes no hazard either way.
    const planned = planThreatRoute(start, objective, [threat({ id: 'far', lon: 0, lat: 8 })], DEFAULT_OPTS)
    expect(planned.waypoints).toHaveLength(2)
  })

  it('uses terrain masking when the detour allowance is too tight to go around', () => {
    const threats = [threat({ id: 'sam', lon: 0, lat: 0 })]
    // A tight allowance forces the route through the ring, so dead ground is
    // the only thing left that can reduce exposure.
    const tight = { ...DEFAULT_OPTS, gridStepM: 8000, maxDetourFactor: 1.12 }

    const exposed = planThreatRoute(start, objective, threats, tight)
    expect(exposed.cumulativeHazard).toBeGreaterThan(0)

    const masked = planThreatRoute(start, objective, threats, {
      ...tight,
      // Everything south of the axis is dead ground to this emitter.
      isMaskedFrom: (_id, p) => p.lat < -0.05,
    })
    expect(masked.cumulativeHazard).toBeLessThan(exposed.cumulativeHazard)
    expect(masked.survivalProbability).toBeGreaterThan(exposed.survivalProbability)
  })

  it('routes around the ring entirely when the allowance permits', () => {
    const threats = [threat({ id: 'sam', lon: 0, lat: 0 })]
    const roomy = planThreatRoute(start, objective, threats, { ...DEFAULT_OPTS, gridStepM: 8000 })
    expect(roomy.cumulativeHazard).toBe(0)
    expect(roomy.survivalProbability).toBe(1)
    expect(roomy.detourFactor).toBeGreaterThan(1)
  })
})
