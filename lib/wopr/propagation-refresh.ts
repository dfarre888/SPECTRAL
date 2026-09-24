import { adjudicatePair, type LaydownPairInput } from '@/lib/operations/adjudication'
import { resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type { MapCuasAsset, MapUasAsset } from '@/lib/map/types'
import { haversineKm } from '@/lib/wopr/fog-of-war'
import { canDefeatUas, platformRole } from '@/lib/wopr/roles'
import type { WoprEventRecord, WorldState, WoprPlatform } from '@/lib/wopr/types'

export interface PropagationCacheEntry {
  pairKey: string
  jam_to_signal_db: number | null
  los_state: string
  combinedBlueSuccessPct: number
  propagationGated: boolean
}

/** Pairs further apart than this are not adjudicated: no RF effect at that range. */
export const MAX_PAIR_KM = 50

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

interface NamedPair {
  input: LaydownPairInput
  uas: WoprPlatform
  cuas: WoprPlatform
}

/**
 * Every drone paired with every opposing platform that can deny or defeat it,
 * whichever force owns the drones. Scenarios without roles fall back to
 * Red drone versus Blue C-UAS (see `platformRole`).
 */
function buildPairs(world: WorldState, tenantId: string): NamedPair[] {
  const pairs: NamedPair[] = []
  const all = [...world.red_orbat.platforms, ...world.blue_orbat.platforms].filter((p) => !p.destroyed)
  for (const uas of all) {
    if (platformRole(uas) !== 'uas') continue
    const uasAsset = platformToUasAsset(uas)
    if (!uasAsset) continue
    for (const cuas of all) {
      if (cuas.side === uas.side) continue
      if (!canDefeatUas(platformRole(cuas))) continue
      if (haversineKm(uas.lat, uas.lon, cuas.lat, cuas.lon) > MAX_PAIR_KM) continue
      pairs.push({
        uas,
        cuas,
        input: {
          uas: {
            instanceId: uas.id,
            asset: uasAsset,
            lat: uas.lat,
            lon: uas.lon,
            discAltitude_m: uas.alt_m,
            terrainAMSL: uas.alt_m - 30,
          },
          cuas: {
            instanceId: cuas.id,
            asset: platformToCuasAsset(cuas),
            lat: cuas.lat,
            lon: cuas.lon,
            terrainAMSL: cuas.alt_m,
          },
          defeatMatrixPk: 50,
          inDefeatRange: true,
          terrainMasked: false,
          tenantId,
        },
      })
    }
  }
  return pairs
}

export async function refreshScenarioPropagation(
  world: WorldState,
  tenantId: string,
): Promise<{
  cache: Record<string, PropagationCacheEntry>
  events: string[]
  records: WoprEventRecord[]
}> {
  const pairs = buildPairs(world, tenantId)
  if (pairs.length === 0) {
    const detail = 'No drone and C-UAS pairs in range to adjudicate'
    return {
      cache: {},
      events: [detail],
      records: [{ type: 'propagation', side: 'referee', detail }],
    }
  }

  const results = await Promise.all(pairs.map((p) => adjudicatePair(p.input)))
  const cache: Record<string, PropagationCacheEntry> = {}
  const events: string[] = []
  const records: WoprEventRecord[] = []

  results.forEach((r, i) => {
    const { uas, cuas } = pairs[i]
    const key = `${r.uasInstanceId}:${r.cuasInstanceId}`
    cache[key] = {
      pairKey: key,
      jam_to_signal_db: r.propagation.jam_to_signal_db,
      los_state: r.propagation.los_state,
      combinedBlueSuccessPct: r.combinedBlueSuccessPct,
      propagationGated: r.propagationGated,
    }
    const js = r.propagation.jam_to_signal_db
    const detail = `${cuas.name} vs ${uas.name}: J/S ${js == null ? 'n/a' : `${js.toFixed(1)} dB`}, ${r.propagation.los_state}, defeat score ${r.combinedBlueSuccessPct}%`
    events.push(detail)
    records.push({
      type: 'propagation',
      side: 'referee',
      entity_id: key,
      entity: `${cuas.name} vs ${uas.name}`,
      detail,
    })
  })

  return { cache, events, records }
}
