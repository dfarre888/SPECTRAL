import { describe, expect, it } from 'vitest'
import { A3DM_DRONES } from '@/lib/a3dm/catalog'
import { a3dmDroneToPlatform, allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import { toMapUasAsset } from '@/lib/map/asset-mappers'
import {
  COTS_MAP_FALLBACK_RANGE_KM,
  COTS_MAP_FALLBACK_SPEED_KMH,
  COTS_MAP_FALLBACK_SPEED_MS,
  isCotsDji,
  resolveMapRangeKm,
  resolveMapSpeedKmh,
} from '@/lib/map/cots-defaults'
import { mergeMapUasCatalog } from '@/lib/map/merge-uas-catalog'
import { filterMapAssets } from '@/lib/map/map-asset-search'
import { computePlatformRangeEnvelope } from '@/lib/map/range-declaration'
import type { Platform } from '@/lib/types'

function stubPlatform(partial: Partial<Platform> & Pick<Platform, 'id' | 'name'>): Platform {
  return {
    manufacturer: null,
    country_of_origin: null,
    nato_reporting_name: null,
    category: 'tactical',
    guidance_type: 'INS+GPS',
    gnss_independent: false,
    ai_autonomous: false,
    swarm_capable: false,
    intel_update_date: null,
    max_speed_kmh: null,
    service_ceiling_m: null,
    range_km: null,
    endurance_hrs: null,
    mtow_kg: null,
    warhead_kg: null,
    length_m: null,
    wingspan_m: null,
    height_m: null,
    unit_cost_usd: null,
    ioc_year: null,
    terminal_speed_kmh: null,
    armor_piercing_mm: null,
    engine_type: null,
    radar_cross_section_m2: null,
    rcs_notes: null,
    c2_uplink_mhz: null,
    c2_downlink_mhz: null,
    data_link_mhz: null,
    frequency_hopping: null,
    gnss_used: [],
    rtk_capable: false,
    nav_backup: [],
    stealth_features: [],
    payload_hardpoints: null,
    weapon_types: [],
    sensor_suite: [],
    known_operators: [],
    conflict_deployments: [],
    itar_controlled: false,
    data_confidence: 'estimated',
    sources: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    year_introduced: null,
    propulsion: null,
    defeat_note: null,
    control_link_freq: null,
    gnss_dependency: null,
    side: 'neutral',
    uas_group: 1,
    ...partial,
  }
}

describe('COTS DJI map defaults', () => {
  it('uses 12 m/s and 5 km when COTS has no published kinematics', () => {
    expect(COTS_MAP_FALLBACK_SPEED_MS).toBe(12)
    expect(COTS_MAP_FALLBACK_SPEED_KMH).toBe(43.2)
    expect(COTS_MAP_FALLBACK_RANGE_KM).toBe(5)

    const dji = { id: 'dji-mavic-pro', name: 'DJI Mavic Pro', manufacturer: 'DJI', category: 'cots' }
    expect(resolveMapRangeKm(null, dji)).toEqual({ km: 5, estimated: true })
    expect(resolveMapSpeedKmh(null, dji)).toEqual({ kmh: 43.2, estimated: true })
  })

  it('keeps OSINT Mavic 3 range and speed', () => {
    const mavic = a3dmDroneToPlatform(A3DM_DRONES.find((d) => d.id === 'dji-mavic-3')!)
    const asset = toMapUasAsset(mavic)
    expect(asset.max_range_km).toBe(15)
    expect(asset.max_speed_kmh).toBe(75)
    expect(asset.rangeEstimated).toBe(false)
    expect(asset.manufacturer).toBe('DJI')
  })

  it('maps unspecified DJI to a 5 km sphere', () => {
    const phantom = stubPlatform({
      id: 'dji-phantom-1',
      name: 'DJI Phantom 1',
      manufacturer: 'DJI',
      category: 'cots',
      catalog_tier: 'cots',
    })
    const asset = toMapUasAsset(phantom)
    expect(asset.max_range_km).toBe(5)
    expect(asset.max_speed_kmh).toBe(43.2)
    expect(asset.rangeEstimated).toBe(true)
    const env = computePlatformRangeEnvelope(asset, 0)
    expect(env.sphereRadiusM).toBe(5000)
  })

  it('merges every A3DM DJI into the map catalogue even when a DB stub exists', () => {
    const dbStub = stubPlatform({
      id: 'dji-mavic-3',
      name: 'DJI Mavic 3',
      manufacturer: 'DJI',
      category: 'cots',
      range_km: null,
      max_speed_kmh: null,
    })
    const merged = mergeMapUasCatalog([dbStub])
    const dji = merged.filter((p) => isCotsDji(p))
    expect(dji.length).toBeGreaterThanOrEqual(80)
    expect(merged.some((p) => p.id === 'dji-mavic-pro')).toBe(true)
    const mavic = merged.find((p) => p.id === 'dji-mavic-3')!
    expect(mavic.range_km).toBe(15)
    expect(mavic.max_speed_kmh).toBe(75)
  })

  it('finds COTS DJI by manufacturer in map search', () => {
    const assets = {
      uas: allA3dmPlatforms().filter((p) => isCotsDji(p)).slice(0, 5).map(toMapUasAsset),
      cuas: [],
      radars: [],
      effectors: [],
    }
    const hits = filterMapAssets(assets, 'dji')
    expect(hits.uas.length).toBe(assets.uas.length)
    expect(hits.total).toBeGreaterThan(0)
  })

  it('places the full A3DM sheet and finds payloads', () => {
    const merged = mergeMapUasCatalog([])
    expect(merged.length).toBe(314)
    const assets = {
      uas: merged.map(toMapUasAsset),
      cuas: [],
      radars: [],
      effectors: [],
    }
    expect(filterMapAssets(assets, 'autel').uas.length).toBeGreaterThan(0)
    expect(filterMapAssets(assets, 'skydio').uas.length).toBeGreaterThan(0)
    const h20t = filterMapAssets(assets, 'h20t')
    expect(h20t.uas.some((u) => u.id === 'dji-matrice-300-rtk')).toBe(true)
    const m300 = assets.uas.find((u) => u.id === 'dji-matrice-300-rtk')
    expect((m300?.payloads?.length ?? 0)).toBeGreaterThan(0)
  })
})
