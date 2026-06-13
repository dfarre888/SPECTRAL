import type { DiffractionEdgeInput } from '@/lib/propagation/types'
import { TERRAIN_MASK_CLEARANCE_M } from '@/lib/map/terrain-masking'

/**
 * Extract knife-edge / Deygout inputs from terrain height samples along an LOS path.
 * Negative clearance_m = obstruction below straight-line LOS.
 */
export function extractDiffractionEdges(
  emitterAlt_m: number,
  receiverAlt_m: number,
  stepHeights_m: number[],
  step_m: number,
  minClearance_m = TERRAIN_MASK_CLEARANCE_M,
): DiffractionEdgeInput[] {
  const edges: DiffractionEdgeInput[] = []
  const totalSteps = stepHeights_m.length
  if (totalSteps === 0) return edges

  const totalDist = totalSteps * step_m

  for (let s = 0; s < totalSteps; s++) {
    const d = (s + 1) * step_m
    const frac = d / totalDist
    const losAlt = emitterAlt_m + frac * (receiverAlt_m - emitterAlt_m)
    const terrain = stepHeights_m[s]
    const clearance_m = losAlt - terrain - minClearance_m

    if (clearance_m < 0) {
      edges.push({
        clearance_m,
        distance_from_emitter_m: d,
      })
    }
  }

  if (edges.length <= 3) return edges

  // Keep dominant obstructions — deepest clearance per 200 m segment
  const bucket_m = 200
  const byBucket = new Map<number, DiffractionEdgeInput>()
  for (const e of edges) {
    const bucket = Math.floor(e.distance_from_emitter_m / bucket_m)
    const prev = byBucket.get(bucket)
    if (!prev || e.clearance_m < prev.clearance_m) {
      byBucket.set(bucket, e)
    }
  }
  return [...byBucket.values()].sort(
    (a, b) => a.distance_from_emitter_m - b.distance_from_emitter_m,
  )
}
