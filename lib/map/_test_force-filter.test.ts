import { describe, expect, it } from 'vitest'
import {
  applyForceFilter,
  applyForceFilterToAssets,
  assetSideForceSides,
  cuasForceSides,
  filterMapAssetHits,
  matchesForceFilter,
  uasForceSides,
} from '@/lib/map/force-filter'
import type { MapAssetsPayload } from '@/lib/map/types'

const redUas = {
  id: 'shahed-136',
  name: 'Shahed-136',
  slug: 'shahed-136',
  category: 'loitering_munition' as const,
  categoryLabel: 'OWA',
  side: 'red' as const,
  image_url: null,
  max_altitude_agl_m: 4000,
  altitude_reference: 'AGL' as const,
  max_range_km: 2500,
  max_speed_kmh: 185,
  endurance_min: 600,
  climb_rate_mpm: 300,
}

const neutralUas = { ...redUas, id: 'generic-fpv', name: 'Generic FPV', side: 'neutral' as const }

const blueCuas = {
  id: 'coyote-block-3',
  name: 'Coyote Block 3',
  categoryLabel: 'Kinetic',
  image_url: null,
  defeat_range_m: 10000,
  defeat_range_km: 10,
  defeat_methods: ['kinetic'],
}

const sample: MapAssetsPayload = {
  uas: [redUas, neutralUas],
  cuas: [blueCuas],
  radars: [
    {
      id: 'an-tpy-2',
      name: 'AN/TPY-2',
      side: 'blue',
      role: 'acquisition',
      roleLabel: 'Acquisition',
      image_url: null,
      detection_range_km: 1000,
      dome_range_km: 500,
      sector_deg: 120,
      bandsLabel: 'X-band',
    },
    {
      id: 'big-bird',
      name: 'Big Bird',
      side: 'red',
      role: 'acquisition',
      roleLabel: 'Acquisition',
      image_url: null,
      detection_range_km: 600,
      dome_range_km: 400,
      sector_deg: 360,
      bandsLabel: 'VHF',
    },
  ],
  effectors: [
    {
      id: 'thaad',
      name: 'THAAD',
      side: 'blue',
      tier: 'strategic_bmd',
      tierLabel: 'BMD',
      effect: 'kinetic_missile',
      engagement_max_km: 200,
      engagement_min_km: 0,
      engagement_dome_km: 200,
      pk_estimate_pct: 90,
      alt_min_km: 40,
      alt_max_km: 150,
      cueing_radar_ids: ['an-tpy-2'],
      linkedRadars: [],
      image_url: null,
    },
  ],
}

describe('uasForceSides', () => {
  it('maps red, blue, and dual-use sides', () => {
    expect(uasForceSides(redUas)).toEqual(['red'])
    expect(uasForceSides({ ...redUas, side: 'blue' })).toEqual(['blue'])
    expect(uasForceSides(neutralUas)).toEqual(['red', 'blue'])
    expect(uasForceSides({ ...redUas, side: null })).toEqual(['red', 'blue'])
  })
})

describe('cuasForceSides', () => {
  it('always returns blue', () => {
    expect(cuasForceSides(blueCuas)).toEqual(['blue'])
    expect(cuasForceSides()).toEqual(['blue'])
  })
})

describe('assetSideForceSides', () => {
  it('maps catalogue side including neutral dual-use', () => {
    expect(assetSideForceSides({ side: 'red' })).toEqual(['red'])
    expect(assetSideForceSides({ side: 'blue' })).toEqual(['blue'])
    expect(assetSideForceSides({ side: 'neutral' })).toEqual(['red', 'blue'])
  })
})

describe('matchesForceFilter', () => {
  it('passes all items for both', () => {
    expect(matchesForceFilter('both', ['red'])).toBe(true)
    expect(matchesForceFilter('both', ['blue'])).toBe(true)
  })

  it('matches when requested side is in effective sides', () => {
    expect(matchesForceFilter('red', ['red'])).toBe(true)
    expect(matchesForceFilter('red', ['red', 'blue'])).toBe(true)
    expect(matchesForceFilter('blue', ['blue'])).toBe(true)
    expect(matchesForceFilter('red', ['blue'])).toBe(false)
  })
})

describe('applyForceFilter', () => {
  it('filters UAS by force', () => {
    const redOnly = applyForceFilter(sample.uas, 'red', uasForceSides)
    expect(redOnly.map((u) => u.id)).toEqual(['shahed-136', 'generic-fpv'])

    const blueOnly = applyForceFilter(sample.uas, 'blue', uasForceSides)
    expect(blueOnly.map((u) => u.id)).toEqual(['generic-fpv'])
  })

  it('returns full list for both', () => {
    expect(applyForceFilter(sample.uas, 'both', uasForceSides)).toHaveLength(2)
  })
})

describe('applyForceFilterToAssets', () => {
  it('splits catalogue by force', () => {
    const red = applyForceFilterToAssets(sample, 'red')
    expect(red.uas).toHaveLength(2)
    expect(red.cuas).toHaveLength(0)
    expect(red.radars.map((r) => r.id)).toEqual(['big-bird'])
    expect(red.effectors).toHaveLength(0)

    const blue = applyForceFilterToAssets(sample, 'blue')
    expect(blue.uas.map((u) => u.id)).toEqual(['generic-fpv'])
    expect(blue.cuas).toHaveLength(1)
    expect(blue.radars.map((r) => r.id)).toEqual(['an-tpy-2'])
    expect(blue.effectors).toHaveLength(1)
  })
})

describe('filterMapAssetHits', () => {
  it('filters mixed search hits by force', () => {
    const hits = [
      { kind: 'uas' as const, asset: redUas },
      { kind: 'cuas' as const, asset: blueCuas },
      { kind: 'radar' as const, asset: sample.radars[1] },
    ]
    const redHits = filterMapAssetHits(hits, 'red')
    expect(redHits.map((h) => h.kind)).toEqual(['uas', 'radar'])

    const blueHits = filterMapAssetHits(hits, 'blue')
    expect(blueHits.map((h) => h.kind)).toEqual(['cuas'])
  })
})
