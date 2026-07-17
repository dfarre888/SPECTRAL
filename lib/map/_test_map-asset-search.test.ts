import { describe, expect, it } from 'vitest'
import { filterMapAssets, matchesMapAssetSearch } from '@/lib/map/map-asset-search'
import type { MapAssetsPayload } from '@/lib/map/types'

const sample: MapAssetsPayload = {
  uas: [
    {
      id: 'shahed-136',
      name: 'Shahed-136',
      slug: 'shahed-136',
      category: 'loitering_munition',
      categoryLabel: 'OWA',
      image_url: null,
      max_altitude_agl_m: 4000,
      altitude_reference: 'AGL',
      max_range_km: 2500,
      max_speed_kmh: 185,
      endurance_min: 600,
      climb_rate_mpm: 300,
    },
  ],
  cuas: [
    {
      id: 'coyote-block-3',
      name: 'Coyote Block 3',
      categoryLabel: 'Kinetic',
      image_url: null,
      defeat_range_m: 10000,
      defeat_range_km: 10,
      defeat_methods: ['kinetic'],
    },
  ],
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
      nato_name: 'FBM radar',
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

describe('matchesMapAssetSearch', () => {
  it('matches multi-token queries across haystack', () => {
    expect(matchesMapAssetSearch('Shahed-136 OWA loitering', 'shahed owa')).toBe(true)
    expect(matchesMapAssetSearch('Shahed-136 OWA', 'shahed patriot')).toBe(false)
  })

  it('normalizes hyphens and case', () => {
    expect(matchesMapAssetSearch('an-tpy-2 AN/TPY-2', 'tpy 2')).toBe(true)
    expect(matchesMapAssetSearch('Coyote Block 3', 'COYOTE')).toBe(true)
  })
})

describe('filterMapAssets', () => {
  it('returns empty when no match', () => {
    const r = filterMapAssets(sample, 'patriot')
    expect(r.total).toBe(0)
  })

  it('finds assets across all categories', () => {
    const r = filterMapAssets(sample, 'thaad')
    expect(r.total).toBe(1)
    expect(r.effectors[0]?.name).toBe('THAAD')
  })

  it('returns all when query empty', () => {
    const r = filterMapAssets(sample, '')
    expect(r.total).toBe(4)
  })
})
