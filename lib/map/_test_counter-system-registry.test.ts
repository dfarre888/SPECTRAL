import { describe, expect, it } from 'vitest'
import { resolveAssetPlacement, resolveCounterPlacementKind } from '@/lib/map/counter-system-registry'
import type { MapAssetsPayload } from '@/lib/map/types'

const assets: MapAssetsPayload = {
  uas: [
    {
      id: 'iron-beam',
      name: 'Iron Beam',
      slug: 'iron-beam',
      category: 'tactical',
      categoryLabel: 'HEL',
      image_url: null,
      max_altitude_agl_m: 100,
      altitude_reference: 'AGL',
      max_range_km: 10,
      max_speed_kmh: 0,
      endurance_min: 0,
      climb_rate_mpm: 0,
    },
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
      id: 'iron-beam',
      name: 'Iron Beam',
      categoryLabel: 'DEW',
      image_url: null,
      defeat_range_m: 4000,
      defeat_range_km: 4,
      defeat_methods: ['laser'],
    },
  ],
  radars: [],
  effectors: [
    {
      id: 'eff-iron-beam',
      name: 'Iron Beam',
      side: 'blue',
      tier: 'c_uas',
      tierLabel: 'C-UAS',
      effect: 'laser',
      engagement_max_km: 10,
      engagement_min_km: 0,
      engagement_dome_km: 10,
      pk_estimate_pct: 90,
      alt_min_km: 0,
      alt_max_km: 5,
      cueing_radar_ids: [],
      linkedRadars: [],
      image_url: null,
    },
  ],
}

describe('counter-system-registry', () => {
  it('routes iron-beam to effector placement', () => {
    expect(resolveCounterPlacementKind('iron-beam', assets)).toBe('effector')
    const resolved = resolveAssetPlacement('iron-beam', assets)
    expect(resolved?.kind).toBe('effector')
    expect(resolved?.asset.id).toBe('eff-iron-beam')
  })

  it('keeps threat UAS as uas', () => {
    expect(resolveCounterPlacementKind('shahed-136', assets)).toBe('uas')
    const resolved = resolveAssetPlacement('shahed-136', assets)
    expect(resolved?.kind).toBe('uas')
  })
})
