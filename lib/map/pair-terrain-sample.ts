import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import { offsetBearingM, TERRAIN_MASK_STEP_M } from '@/lib/map/terrain-masking'
import { sampleTerrainBatch } from '@/lib/map/terrain'
import { extractDiffractionEdges } from '@/lib/propagation/terrain-edges'
import type { DiffractionEdgeInput } from '@/lib/propagation/types'
import { haversineM } from '@/lib/propagation/geo'
import { bearingDeg } from '@/lib/spectrum/effector-types'

export async function samplePairDiffractionEdges(
  Cesium: CesiumModule,
  terrainProvider: CesiumTerrainProvider,
  emitterLon: number,
  emitterLat: number,
  emitterAlt_m: number,
  receiverLon: number,
  receiverLat: number,
  receiverAlt_m: number,
  viewer?: CesiumViewer | null,
): Promise<DiffractionEdgeInput[]> {
  const dist = haversineM(emitterLat, emitterLon, receiverLat, receiverLon)
  if (dist < TERRAIN_MASK_STEP_M) return []

  const bearing = bearingDeg(
    { lat: emitterLat, lon: emitterLon },
    { lat: receiverLat, lon: receiverLon },
  )
  const steps = Math.min(120, Math.max(1, Math.floor(dist / TERRAIN_MASK_STEP_M)))
  const step_m = dist / steps

  const points: { lon: number; lat: number }[] = []
  for (let s = 1; s <= steps; s++) {
    const pt = offsetBearingM(emitterLon, emitterLat, bearing, s * step_m)
    points.push(pt)
  }

  const heights = await sampleTerrainBatch(Cesium, terrainProvider, points, viewer)
  return extractDiffractionEdges(emitterAlt_m, receiverAlt_m, heights, step_m)
}
