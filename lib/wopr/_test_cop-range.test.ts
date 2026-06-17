import { describe, expect, it } from 'vitest'
import { resolveCopRangeKm } from '@/lib/wopr/cop-range'
import { worldStateToCopEntities } from '@/lib/wopr/cop-entities'
import { createDefaultWorldState } from '@/lib/wopr/engine'
import type { WoprPlatform, WoprScenario } from '@/lib/wopr/types'

function makePlatform(overrides: Partial<WoprPlatform>): WoprPlatform {
  return {
    id: 'test-1',
    name: 'Test',
    lat: -35.28,
    lon: 149.13,
    alt_m: 100,
    side: 'red',
    platform_type: 'shahed-136',
    radiating: true,
    destroyed: false,
    ...overrides,
  }
}

describe('resolveCopRangeKm', () => {
  it('returns non-zero km for shahed-136 slug', () => {
    const p = makePlatform({ platform_type: 'shahed-136', side: 'red' })
    const km = resolveCopRangeKm(p, 'drone')
    expect(km).toBeGreaterThan(0)
  })

  it('returns ~12 km for edge-horizon from offline seed', () => {
    const p = makePlatform({
      platform_type: 'edge-horizon',
      side: 'blue',
      name: 'Edge Horizon',
    })
    const km = resolveCopRangeKm(p, 'jammer')
    expect(km).toBeCloseTo(12, 0)
  })

  it('falls back for unknown blue slug', () => {
    const p = makePlatform({
      platform_type: 'unknown-system-xyz',
      side: 'blue',
    })
    const km = resolveCopRangeKm(p, 'defeat_system')
    expect(km).toBe(5)
  })
})

describe('worldStateToCopEntities range_km', () => {
  it('sets range_km on ORBAT entities', () => {
    const world = createDefaultWorldState()
    world.red_orbat.platforms = [
      makePlatform({ id: 'red-shahed-0', platform_type: 'shahed-136' }),
    ]
    world.blue_orbat.platforms = [
      makePlatform({
        id: 'blue-edge-0',
        platform_type: 'edge-horizon',
        side: 'blue',
        name: 'Edge Horizon',
      }),
    ]
    const scenario: WoprScenario = {
      id: 's1',
      tenant_id: 't1',
      name: 'Test',
      classification: 'UNCLASSIFIED',
      world_state: world,
      elapsed_min: 0,
      status: 'draft',
    }
    const entities = worldStateToCopEntities(scenario, 'orbat')
    expect(entities).toHaveLength(2)
    expect(entities[0].range_km).toBeGreaterThan(0)
    expect(entities[1].range_km).toBeCloseTo(12, 0)
  })
})
