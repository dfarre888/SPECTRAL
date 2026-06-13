import { adjudicatePair, type LaydownPairInput } from '@/lib/operations/adjudication'
import { cuasAssetToSpectrumBlue, resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type { MapCuasAsset, MapUasAsset } from '@/lib/map/types'
import type { WorldState, WoprPlatform } from '@/lib/wopr/types'

export interface PropagationCacheEntry {
  pairKey: string
  jam_to_signal_db: number | null
  los_state: string
  combinedBlueSuccessPct: number
  propagationGated: boolean
}

function platformToUasAsset(p: WoprPlatform): MapUasAsset | null {
  const spec = resolveSpectrumUas(p.platform_type)
  if (!spec) return null
  return {
    id: p.platform_type,
    name: p.name,
    slug: p.platform_type,
    category: 'tactical',
    categoryLabel: 'UAS',
    image_url: null,
    max_altitude_agl_m: 500,
    altitude_reference: 'AGL',
    max_range_km: 50,
    max_speed_kmh: 120,
    endurance_min: 60,
    climb_rate_mpm: 300,
  }
}

function platformToCuasAsset(p: WoprPlatform): MapCuasAsset {
  return {
    id: p.platform_type,
    name: p.name,
    categoryLabel: 'C-UAS',
    image_url: null,
    defeat_range_m: 5000,
    defeat_range_km: 5,
    defeat_methods: ['RF_jamming'],
  }
}

function buildPairs(world: WorldState, tenantId: string): LaydownPairInput[] {
  const pairs: LaydownPairInput[] = []
  for (const red of world.red_orbat.platforms) {
    if (red.destroyed) continue
    for (const blue of world.blue_orbat.platforms) {
      if (blue.destroyed) continue
      const uasAsset = platformToUasAsset(red)
      if (!uasAsset) continue
      const cuasAsset = platformToCuasAsset(blue)
      pairs.push({
        uas: {
          instanceId: red.id,
          asset: uasAsset,
          lat: red.lat,
          lon: red.lon,
          discAltitude_m: red.alt_m,
          terrainAMSL: red.alt_m - 30,
        },
        cuas: {
          instanceId: blue.id,
          asset: cuasAsset,
          lat: blue.lat,
          lon: blue.lon,
          terrainAMSL: blue.alt_m,
        },
        defeatMatrixPk: 50,
        inDefeatRange: true,
        terrainMasked: false,
        tenantId,
      })
    }
  }
  return pairs
}

export async function refreshScenarioPropagation(
  world: WorldState,
  tenantId: string,
): Promise<{ cache: Record<string, PropagationCacheEntry>; events: string[] }> {
  const pairs = buildPairs(world, tenantId)
  if (pairs.length === 0) {
    return { cache: {}, events: ['No ORBAT pairs to adjudicate'] }
  }

  const results = await Promise.all(pairs.map((p) => adjudicatePair(p)))
  const cache: Record<string, PropagationCacheEntry> = {}
  const events: string[] = []

  for (const r of results) {
    const key = `${r.uasInstanceId}:${r.cuasInstanceId}`
    cache[key] = {
      pairKey: key,
      jam_to_signal_db: r.propagation.jam_to_signal_db,
      los_state: r.propagation.los_state,
      combinedBlueSuccessPct: r.combinedBlueSuccessPct,
      propagationGated: r.propagationGated,
    }
    events.push(
      `${key} J/S ${r.propagation.jam_to_signal_db?.toFixed(1) ?? '—'} dB · ${r.propagation.los_state}`,
    )
  }

  return { cache, events }
}
