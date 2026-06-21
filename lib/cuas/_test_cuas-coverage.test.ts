/**
 * SPECTRAL — C-UAS coverage engine tests
 */
import { describe, it, expect } from 'vitest'
import { CuasCoverageEngine, CUAS_PERFORMANCE_REF } from '@/lib/cuas/cuasCoverageEngine'
import { GroundRiskEngine } from '@/lib/cuas/groundRiskEngine'

const engine = new CuasCoverageEngine()

const cuas = (id: string, lon: number, lat: number, range = 5000) => ({
  id,
  name: id,
  lon,
  lat,
  defeat_range_m: range,
})

const uas = (id: string, lon: number, lat: number) => ({ id, name: id, lon, lat })

describe('CuasCoverageEngine', () => {
  it('exposes SOVEREIGN performance_ref', () => {
    expect(engine.performance_ref).toBe(CUAS_PERFORMANCE_REF)
    expect(CUAS_PERFORMANCE_REF).toBe('SOVEREIGN_CORE_BOUNDARY')
  })

  it('returns no_assets when no C-UAS placed', () => {
    const r = engine.analyseCoverage([], [uas('t1', 149.1, -35.1)])
    expect(r.verdict).toBe('no_assets')
    expect(r.performance_ref).toBe('SOVEREIGN_CORE_BOUNDARY')
    expect(r.gaps).toHaveLength(1)
  })

  it('marks threat inside defeat range as covered', () => {
    const r = engine.analyseCoverage([cuas('c1', 149.0, -35.0)], [uas('t1', 149.01, -35.01)])
    expect(r.covered_count).toBe(1)
    expect(r.verdict).toBe('adequate')
    expect(r.gaps).toHaveLength(0)
  })

  it('records gap when threat outside range', () => {
    const r = engine.analyseCoverage([cuas('c1', 149.0, -35.0, 1000)], [uas('t1', 149.2, -35.2)])
    expect(r.gaps).toHaveLength(1)
    expect(r.verdict).toBe('inadequate')
  })

  it('computeCoveragePolygon closes the ring', () => {
    const ring = engine.computeCoveragePolygon(149, -35, 2000, 16)
    expect(ring.length).toBe(17)
    expect(ring[0].lon).toBeCloseTo(ring[ring.length - 1].lon, 5)
    expect(ring[0].lat).toBeCloseTo(ring[ring.length - 1].lat, 5)
  })

  it('polygon default uses 32 segments (+1 closing point)', () => {
    expect(engine.computeCoveragePolygon(0, 0, 500).length).toBe(33)
  })

  it('findOptimalSitingPosition returns coordinates', () => {
    const rec = engine.findOptimalSitingPosition(
      [cuas('c1', 149, -35, 2000)],
      [uas('t1', 149.05, -35.05)],
    )
    expect(typeof rec.lon).toBe('number')
    expect(typeof rec.lat).toBe('number')
    expect(rec.rationale.length).toBeGreaterThan(5)
  })

  it('partial verdict when only some threats covered', () => {
    const r = engine.analyseCoverage(
      [cuas('c1', 149, -35, 3000)],
      [uas('near', 149.01, -35.01), uas('far', 149.5, -35.5)],
    )
    expect(r.verdict).toBe('partial')
    expect(r.coverage_pct).toBe(50)
  })

  it('adequate with zero threats', () => {
    const r = engine.analyseCoverage([cuas('c1', 149, -35)], [])
    expect(r.verdict).toBe('adequate')
    expect(r.coverage_pct).toBe(100)
  })

  it('siting recommendation emitted when gaps exist', () => {
    const r = engine.analyseCoverage([cuas('c1', 149, -35, 500)], [uas('t1', 149.2, -35.2)])
    expect(r.siting_recommendations).toHaveLength(1)
    expect(r.siting_recommendations[0].expected_additional_coverage).toBeGreaterThan(0)
  })

  it('multi-site coverage can cover distant threat', () => {
    const sites = [cuas('c1', 149.0, -35.0, 4000), cuas('c2', 149.08, -35.08, 4000)]
    const r = engine.analyseCoverage(sites, [uas('t1', 149.02, -35.02)])
    expect(r.covered_count).toBe(1)
  })
})

describe('GroundRiskEngine', () => {
  it('grades low risk for remote open laydown', () => {
    const g = new GroundRiskEngine().assess({
      cuas_name: 'Test',
      defeat_range_m: 3000,
      nearest_civilian_structure_m: 5000,
      rf_jamming_capable: false,
      population_tier: 'remote',
    })
    expect(g.overall.value).toBe('low')
    expect(g.overall.grade).toBe('confirmed')
  })
})
