import { pathBuildingObstructed } from '@/lib/buildings/ray-intersect'
import { loadBuildingsForTenant } from '@/lib/buildings/store'
import { analyzePropagation } from '@/lib/propagation/analyze'
import { assessEngagement } from '@/lib/spectrum/engagement'
import { cuasAssetToSpectrumBlue, resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type { MapCuasAsset, MapUasAsset, OverlapVolume } from '@/lib/map/types'
import type { PropagationResult } from '@/lib/propagation/types'
import type { EngagementResult } from '@/lib/spectrum/types'

export interface LaydownPairInput {
  uas: { instanceId: string; asset: MapUasAsset; lat: number; lon: number; discAltitude_m: number; terrainAMSL: number }
  cuas: { instanceId: string; asset: MapCuasAsset; lat: number; lon: number; terrainAMSL: number }
  defeatMatrixPk: number | null
  inDefeatRange: boolean
  terrainMasked: boolean
  tenantId: string
}

export interface AdjudicatedPair {
  uasInstanceId: string
  cuasInstanceId: string
  propagation: PropagationResult
  spectrum: EngagementResult
  combinedBlueSuccessPct: number
  propagationGated: boolean
  buildingObstructed: boolean
}

function defaultJamErp(cuas: MapCuasAsset): number {
  if (cuas.defeat_methods.includes('RF_jamming')) return 40
  if (cuas.defeat_methods.includes('kinetic')) return 0
  return 35
}

export async function adjudicatePair(input: LaydownPairInput): Promise<AdjudicatedPair> {
  const red = resolveSpectrumUas(input.uas.asset.id)
  const blue = cuasAssetToSpectrumBlue(input.cuas.asset)
  const spectrum = red && blue ? assessEngagement(red, blue) : {
    verdict: 'no_engagement' as const,
    headline: 'Platform not in spectrum catalogue',
    detail: '',
    overlaps: [],
    uncovered: [],
    recommendations: [],
  }

  const buildings = await loadBuildingsForTenant(input.tenantId)
  const buildingObstructed = pathBuildingObstructed(
    input.cuas.lat,
    input.cuas.lon,
    input.cuas.terrainAMSL + 2,
    input.uas.lat,
    input.uas.lon,
    input.uas.discAltitude_m,
    buildings,
  )

  const propagation = analyzePropagation({
    emitter: {
      position: {
        lat: input.cuas.lat,
        lon: input.cuas.lon,
        alt_m: input.cuas.terrainAMSL + 2,
      },
      freq_hz: 2.4e9,
      erp_dbm: defaultJamErp(input.cuas.asset),
    },
    receiver: {
      position: {
        lat: input.uas.lat,
        lon: input.uas.lon,
        alt_m: input.uas.discAltitude_m,
      },
      sensitivity_dbm: -90,
    },
    environment: {
      urban_density: buildingObstructed ? 'urban' : 'suburban',
      terrain_obstructed: input.terrainMasked,
      building_obstructed: buildingObstructed,
    },
    jammer_erp_dbm: input.cuas.asset.defeat_methods.includes('RF_jamming')
      ? defaultJamErp(input.cuas.asset)
      : undefined,
  })

  const propagationGated =
    !input.inDefeatRange ||
    propagation.los_state === 'NLOS' ||
    input.terrainMasked ||
    (buildingObstructed && propagation.los_state !== 'LOS')

  const matrixPk = input.defeatMatrixPk ?? 50
  const jts = propagation.jam_to_signal_db ?? 0
  const jamBonus = jts > 10 ? 15 : jts > 0 ? 5 : -10
  const spectrumScore =
    spectrum.verdict === 'defeat_likely'
      ? 82
      : spectrum.verdict === 'partial'
        ? 48
        : spectrum.verdict === 'detect_only'
          ? 22
          : 12

  let combined = input.inDefeatRange
    ? Math.round(matrixPk * 0.4 + spectrumScore * 0.35 + Math.min(100, 50 + jamBonus) * 0.25)
    : 0

  if (propagationGated && input.cuas.asset.defeat_methods.includes('RF_jamming')) {
    combined = Math.round(combined * 0.55)
  }
  if (input.terrainMasked) combined = Math.round(combined * 0.7)

  combined = Math.max(0, Math.min(100, combined))

  return {
    uasInstanceId: input.uas.instanceId,
    cuasInstanceId: input.cuas.instanceId,
    propagation,
    spectrum,
    combinedBlueSuccessPct: combined,
    propagationGated,
    buildingObstructed,
  }
}

export function overlapVolumeToPk(vol: OverlapVolume | undefined): number | null {
  return vol?.effectiveness_pct ?? null
}
