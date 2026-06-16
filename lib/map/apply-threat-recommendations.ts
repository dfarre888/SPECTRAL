import { haversineM, offsetApprox1Km } from '@/lib/propagation/geo'
import type { ThreatAssessment } from '@/lib/map/threat-assessment'
import type { MapCuasAsset, PlacedCuas, PlacedUas } from '@/lib/map/types'

export interface RecommendedPlacement {
  assetId: string
  lon: number
  lat: number
}

const NEAR_THREAT_RADIUS_M = 2500

/** Catalog asset ids from recommended detection + defeat (deduped, detection first). */
export function collectRecommendedAssetIds(assessment: ThreatAssessment): string[] {
  const ids: string[] = []
  if (assessment.recommendedDetection) ids.push(assessment.recommendedDetection.assetId)
  if (
    assessment.recommendedDefeat &&
    assessment.recommendedDefeat.assetId !== assessment.recommendedDetection?.assetId
  ) {
    ids.push(assessment.recommendedDefeat.assetId)
  }
  return ids
}

export function hasCuasNearThreat(
  placedCuas: PlacedCuas[],
  assetId: string,
  uas: PlacedUas,
  radiusM: number = NEAR_THREAT_RADIUS_M,
): boolean {
  return placedCuas.some(
    (c) =>
      c.asset.id === assetId &&
      haversineM(c.lat, c.lon, uas.lat, uas.lon) <= radiusM,
  )
}

/** First recommended system at threat position; second (if different) ~1 km offset. Skips already-near assets. */
export function planRecommendedPlacements(
  assessment: ThreatAssessment,
  uas: PlacedUas,
  placedCuas: PlacedCuas[],
  catalogCuas: MapCuasAsset[],
  offsetBearingDeg = 135,
): RecommendedPlacement[] {
  const catalogIds = new Set(catalogCuas.map((c) => c.id))
  const orderedIds = collectRecommendedAssetIds(assessment).filter((id) => catalogIds.has(id))

  const placements: RecommendedPlacement[] = []
  let offsetIndex = 0

  for (const assetId of orderedIds) {
    if (hasCuasNearThreat(placedCuas, assetId, uas)) continue

    if (offsetIndex === 0) {
      placements.push({ assetId, lon: uas.lon, lat: uas.lat })
    } else {
      const { lat, lon } = offsetApprox1Km(uas.lat, uas.lon, offsetBearingDeg)
      placements.push({ assetId, lon, lat })
    }
    offsetIndex += 1
  }

  return placements
}
