import { pathBuildingObstructed, rayBuildingHit } from '@/lib/buildings/ray-intersect'
import { loadBuildingsForTenant } from '@/lib/buildings/store'
import { analyzePropagation } from '@/lib/propagation/analyze'
import { assessEngagement, propagationEngagementViable } from '@/lib/spectrum/engagement'
import { resolveJamFromEngagement } from '@/lib/spectrum/erp-resolve'
import { cuasAssetToSpectrumBlue, resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type { MapCuasAsset, MapUasAsset, OverlapVolume } from '@/lib/map/types'
import type { DiffractionEdgeInput, PropagationResult } from '@/lib/propagation/types'
import type { EngagementResult } from '@/lib/spectrum/types'

export interface LaydownPairInput {
  uas: { instanceId: string; asset: MapUasAsset; lat: number; lon: number; discAltitude_m: number; terrainAMSL: number }
  cuas: { instanceId: string; asset: MapCuasAsset; lat: number; lon: number; terrainAMSL: number }
  defeatMatrixPk: number | null
  inDefeatRange: boolean
  terrainMasked: boolean
  /** Client-computed Deygout chain from pair-path terrain ray-march. */
  diffraction_edges?: DiffractionEdgeInput[]
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
    effectiveCoverage: 0,
  }

  const buildings = await loadBuildingsForTenant(input.tenantId)
  const emitterAlt = input.cuas.terrainAMSL + 2

  const jamTransmit =
    blue && input.cuas.asset.defeat_methods.includes('RF_jamming')
      ? resolveJamFromEngagement(blue, spectrum.overlaps)
      : null

  const buildingHit = rayBuildingHit(
    input.cuas.lat,
    input.cuas.lon,
    emitterAlt,
    input.uas.lat,
    input.uas.lon,
    input.uas.discAltitude_m,
    buildings,
    jamTransmit?.freq_hz ?? 2.4e9,
  )
  const buildingObstructed =
    buildingHit?.obstructed ??
    pathBuildingObstructed(
      input.cuas.lat,
      input.cuas.lon,
      emitterAlt,
      input.uas.lat,
      input.uas.lon,
      input.uas.discAltitude_m,
      buildings,
    )
  // P0-C: Red GCS transmit ERP is the control-link signal the jammer must overpower.
  // J/S denominator = received GCS power at the UAS; jammer ERP = J/S numerator.
  // Co-located GCS assumption gives the most conservative (highest) J/S estimate.
  const redControl = red?.capabilities?.find((c) => c.fn === 'control')
  const gcsErp_dbm = redControl?.power_dbm ?? 23 // 200 mW GCS EIRP default

  const propagation = analyzePropagation({
    emitter: {
      position: {
        lat: input.cuas.lat,
        lon: input.cuas.lon,
        alt_m: emitterAlt,
      },
      freq_hz: jamTransmit?.freq_hz ?? 2.4e9,
      erp_dbm: gcsErp_dbm, // GCS control-link ERP as J/S signal baseline (P0-C)
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
      building_penetration_loss_db: buildingHit?.penetration_loss_db,
      diffraction_edges: input.diffraction_edges,
    },
    jammer_erp_dbm: jamTransmit?.erp_dbm, // actual jammer ERP for J/S numerator
  })

  const isRfJammer = input.cuas.asset.defeat_methods.includes('RF_jamming')
  // Band overlap alone is insufficient — propagationEngagementViable checks that the RF link
  // can physically reach the target (not NLOS, J/S ≥ 3 dB). A jammer that overlaps every band
  // but can't reach the receiver scores no better than no_engagement on the spectrum component.
  const rfViable = isRfJammer
    ? propagationEngagementViable(spectrum.overlaps, propagation)
    : true

  const propagationGated =
    !input.inDefeatRange ||
    propagation.los_state === 'NLOS' ||
    input.terrainMasked ||
    (buildingObstructed && propagation.los_state !== 'LOS') ||
    (isRfJammer && !rfViable)

  const matrixPk = input.defeatMatrixPk ?? 50
  const jts = propagation.jam_to_signal_db ?? 0
  // Continuous spectrum score derived from defeat-resistance-weighted coverage (0–90).
  // Replaces the old 4-bucket lookup so partial hardening is penalised proportionally.
  // detect_only stays at 22 (provides targeting, not defeat).
  // no_engagement / kinetic stays at 12 (matrixPk carries the kinetic baseline).
  const spectrumScore = rfViable
    ? spectrum.verdict === 'defeat_likely' || spectrum.verdict === 'partial'
      ? Math.round(spectrum.effectiveCoverage * 90)  // continuous 0–90
      : spectrum.verdict === 'detect_only'
        ? 22
        : 12
    : 12  // NLOS or J/S < 3 dB → treat as no_engagement regardless of band match
  const jamBonus = rfViable ? (jts > 10 ? 15 : jts > 0 ? 5 : -10) : -10

  let combined = input.inDefeatRange
    ? Math.round(matrixPk * 0.4 + spectrumScore * 0.35 + Math.min(100, 50 + jamBonus) * 0.25)
    : 0

  // Partial propagation degradation — RF jammer has a viable link but path is degraded
  // (terrain shadow or building attenuation, not a hard NLOS fail)
  if (propagationGated && isRfJammer && rfViable) {
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
