import { describe, it, expect } from 'vitest'
import {
  assessSite,
  costLabel,
  discCoverage,
  formatPct,
  formatRangeM,
  isAdversaryOrigin,
  layersForSystem,
  normaliseItems,
  publishedRangeM,
  systemRole,
  unitPositions,
  unitPriceUsd,
  type CatalogueSystem,
} from '@/lib/base-protection/coverage'

const sys = (id: string, tags: string[], range: number | null, price: number | string | null = null): CatalogueSystem => ({
  id,
  name: id,
  manufacturer: null,
  country: 'Australia',
  defeat_method: tags,
  effective_range_m: range,
  price_usd_approx: price,
  portability: 'vehicle',
  data_confidence: 'medium',
  sources: [],
})

const CAT = new Map<string, CatalogueSystem>(
  [
    sys('radar-10k', ['detect'], 10_000),
    sys('radar-2k', ['detect'], 2_000),
    sys('jammer-3k', ['RF_jamming'], 3_000, 250_000),
    sys('gun-1k', ['kinetic'], 1_000),
    sys('integrated-4k', ['RF_jamming', 'combined'], 4_000, 750_000),
    sys('no-range', ['kinetic'], null, 500_000),
    sys('per-shot', ['laser'], 5_000, 3),
  ].map((s) => [s.id, s]),
)

const SITE = { id: 'test-site', nominalRadiusM: 5_000 }

describe('layer crediting from catalogue tags', () => {
  it('credits sensors with detect and track only', () => {
    expect(layersForSystem({ defeat_method: ['detect'] })).toEqual(['detect', 'track'])
    expect(systemRole({ defeat_method: ['detect'] })).toBe('sensor')
  })
  it('credits effectors with defeat only', () => {
    expect(layersForSystem({ defeat_method: ['RF_jamming'] })).toEqual(['defeat'])
    expect(layersForSystem({ defeat_method: ['kinetic', 'net'] })).toEqual(['defeat'])
    expect(systemRole({ defeat_method: ['laser'] })).toBe('effector')
  })
  it('credits integrated systems with all three layers', () => {
    expect(layersForSystem({ defeat_method: ['RF_jamming', 'combined'] })).toEqual(['detect', 'track', 'defeat'])
    expect(layersForSystem({ defeat_method: ['RF_jamming', 'detect'] })).toEqual(['detect', 'track', 'defeat'])
    expect(systemRole({ defeat_method: ['combined'] })).toBe('integrated')
  })
  it('is case-insensitive and tolerates null tags', () => {
    expect(layersForSystem({ defeat_method: ['DETECT'] })).toEqual(['detect', 'track'])
    expect(layersForSystem({ defeat_method: null })).toEqual([])
    expect(systemRole({ defeat_method: [] })).toBeNull()
  })
})

describe('ranges and prices are never guessed', () => {
  it('treats missing or non-positive range as not published', () => {
    expect(publishedRangeM({ effective_range_m: null })).toBeNull()
    expect(publishedRangeM({ effective_range_m: 0 })).toBeNull()
    expect(publishedRangeM({ effective_range_m: 4000 })).toBe(4000)
    expect(formatRangeM(null)).toBe('range not published')
  })
  it('ignores per-engagement figures posing as unit prices', () => {
    expect(unitPriceUsd({ price_usd_approx: 3 })).toEqual({ usd: null, status: 'per_engagement_only' })
    expect(unitPriceUsd({ price_usd_approx: null })).toEqual({ usd: null, status: 'no_public_cost' })
    expect(unitPriceUsd({ price_usd_approx: '750000' })).toEqual({ usd: 750_000, status: 'published' })
  })
})

describe('geometry', () => {
  it('computes exact centre coverage as an area ratio', () => {
    expect(discCoverage(5000, [{ x: 0, y: 0, r: 2500 }])).toBeCloseTo(0.25, 6)
    expect(discCoverage(5000, [{ x: 0, y: 0, r: 8000 }])).toBe(1)
    expect(discCoverage(5000, [])).toBe(0)
  })
  it('samples off-centre unions within about a percentage point', () => {
    // Two circles of r = R/2 at (±R/2, 0): each covers exactly a quarter of the disc, no overlap.
    const f = discCoverage(1000, [
      { x: 500, y: 0, r: 500 },
      { x: -500, y: 0, r: 500 },
    ])
    expect(f).toBeGreaterThan(0.49)
    expect(f).toBeLessThan(0.51)
  })
  it('places one unit at the centre and more on a ring at half the radius, first due north', () => {
    expect(unitPositions(1, 4000)).toEqual([{ x: 0, y: 0 }])
    const p = unitPositions(4, 4000)
    expect(p).toHaveLength(4)
    expect(p[0].x).toBeCloseTo(0, 6)
    expect(p[0].y).toBeCloseTo(2000, 6)
    for (const u of p) expect(Math.hypot(u.x, u.y)).toBeCloseTo(2000, 6)
  })
})

describe('assessSite', () => {
  it('defaults to none assigned with every layer uncovered', () => {
    const a = assessSite(SITE, null, CAT)
    expect(a.hasPackage).toBe(false)
    expect(a.uncovered).toEqual(['detect', 'track', 'defeat'])
    expect(a.cost.status).toBe('no_package')
    expect(costLabel(a.cost)).toBe('No package')
    expect(a.radiusM).toBe(5000)
    expect(a.radiusIsDefault).toBe(true)
  })

  it('layers a sensor and an effector and reports the remaining gap', () => {
    const a = assessSite(SITE, { items: [{ systemId: 'radar-10k', qty: 1 }, { systemId: 'jammer-3k', qty: 1 }], radiusM: null }, CAT)
    expect(a.layers.detect.fraction).toBe(1)
    expect(a.layers.track.fraction).toBe(1)
    expect(a.layers.defeat.fraction).toBeCloseTo(0.36, 6)
    expect(a.uncovered).toEqual(['defeat'])
    expect(formatPct(a.layers.defeat.fraction)).toBe('36%')
  })

  it('closes the defeat gap with more units on the ring', () => {
    const one = assessSite(SITE, { items: [{ systemId: 'integrated-4k', qty: 1 }], radiusM: null }, CAT)
    const four = assessSite(SITE, { items: [{ systemId: 'integrated-4k', qty: 4 }], radiusM: null }, CAT)
    expect(one.layers.defeat.fraction).toBeCloseTo(0.64, 6)
    expect(four.layers.defeat.fraction).toBeGreaterThan(0.99)
    expect(four.uncovered).toEqual([])
    expect(four.units).toHaveLength(4)
  })

  it('excludes systems without a published range from the maths but keeps them in the package', () => {
    const a = assessSite(SITE, { items: [{ systemId: 'no-range', qty: 2 }], radiusM: null }, CAT)
    expect(a.items[0].rangeStatus).toBe('not_published')
    expect(a.units).toHaveLength(0)
    expect(a.layers.defeat.fraction).toBe(0)
    expect(a.cost).toMatchObject({ status: 'published', totalUsd: 1_000_000 })
  })

  it('reports partial and missing cost honestly', () => {
    const partial = assessSite(SITE, { items: [{ systemId: 'jammer-3k', qty: 2 }, { systemId: 'gun-1k', qty: 3 }], radiusM: null }, CAT)
    expect(partial.cost).toMatchObject({ status: 'partial', totalUsd: 500_000, pricedUnits: 2, unpricedUnits: 3 })
    expect(costLabel(partial.cost)).toBe('US$500k + 3 unpriced')
    const none = assessSite(SITE, { items: [{ systemId: 'per-shot', qty: 1 }], radiusM: null }, CAT)
    expect(none.cost.status).toBe('no_public_cost')
    expect(costLabel(none.cost)).toBe('No public cost')
  })

  it('keeps unknown system ids visible rather than dropping them', () => {
    const a = assessSite(SITE, { items: [{ systemId: 'retired-row', qty: 1 }], radiusM: null }, CAT)
    expect(a.items[0].rangeStatus).toBe('not_in_catalogue')
    expect(a.hasPackage).toBe(true)
  })

  it('honours a radius override', () => {
    const a = assessSite(SITE, { items: [{ systemId: 'radar-2k', qty: 1 }], radiusM: 2000 }, CAT)
    expect(a.radiusM).toBe(2000)
    expect(a.radiusIsDefault).toBe(false)
    expect(a.uncovered).toEqual(['defeat'])
  })
})

describe('helpers', () => {
  it('merges duplicate items and clamps quantity', () => {
    expect(normaliseItems([{ systemId: 'a', qty: 2 }, { systemId: 'a', qty: 3 }, { systemId: '', qty: 1 }, { systemId: 'b', qty: 99 }])).toEqual([
      { systemId: 'a', qty: 5 },
      { systemId: 'b', qty: 12 },
    ])
  })
  it('flags adversary-origin catalogue rows', () => {
    expect(isAdversaryOrigin('Russia/Export')).toBe(true)
    expect(isAdversaryOrigin('China')).toBe(true)
    expect(isAdversaryOrigin('Australia/USA')).toBe(false)
  })
})
