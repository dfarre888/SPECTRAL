import { haversineM } from '@/lib/propagation/geo'
import { bearingDeg } from '@/lib/spectrum/effector-types'
import type { MaskingRayResult } from '@/lib/map/terrain-masking'

/** Interpolate MEA visible distance at arbitrary bearing from azimuth rays. */
export function visibleDistanceAtBearing(
  bearing: number,
  rays: MaskingRayResult[],
): number {
  if (rays.length === 0) return Infinity
  const norm = ((bearing % 360) + 360) % 360
  const sorted = [...rays].sort((a, b) => a.angleDeg - b.angleDeg)

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    const b = sorted[(i + 1) % sorted.length]
    const aAng = a.angleDeg
    let bAng = b.angleDeg
    if (i === sorted.length - 1) bAng += 360

    if (norm >= aAng && norm <= bAng) {
      const span = bAng - aAng || 1
      const t = (norm - aAng) / span
      return a.visibleDistance_m + t * (b.visibleDistance_m - a.visibleDistance_m)
    }
  }

  const nearest = sorted.reduce((best, r) => {
    const d = Math.min(
      Math.abs(r.angleDeg - norm),
      360 - Math.abs(r.angleDeg - norm),
    )
    return d < best.delta ? { ray: r, delta: d } : best
  }, { ray: sorted[0], delta: Infinity })
  return nearest.ray.visibleDistance_m
}

/**
 * Per-pair terrain mask: UAS beyond MEA visible distance at pair bearing is terrain-masked.
 */
export function isPairTerrainMasked(
  cuasLon: number,
  cuasLat: number,
  uasLon: number,
  uasLat: number,
  rays: MaskingRayResult[] | undefined,
): { masked: boolean; pairDistance_m: number; bearing_deg: number } {
  const pairDistance_m = haversineM(cuasLat, cuasLon, uasLat, uasLon)
  const bearing_deg = bearingDeg({ lat: cuasLat, lon: cuasLon }, { lat: uasLat, lon: uasLon })

  if (!rays?.length) {
    return { masked: false, pairDistance_m, bearing_deg }
  }

  const visible_m = visibleDistanceAtBearing(bearing_deg, rays)
  const masked = pairDistance_m > visible_m + 25
  return { masked, pairDistance_m, bearing_deg }
}
