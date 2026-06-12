import { penetrationLossDb } from '@/lib/buildings/materials'
import type { BuildingFootprint, BuildingRayHit } from '@/lib/buildings/types'

function pointInPolygon(
  lat: number,
  lon: number,
  polygon: { lat: number; lon: number }[],
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon
    const yi = polygon[i].lat
    const xj = polygon[j].lon
    const yj = polygon[j].lat
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Sample ray at midpoint for footprint intersection (Estimated). */
export function rayBuildingHit(
  lat1: number,
  lon1: number,
  alt1: number,
  lat2: number,
  lon2: number,
  alt2: number,
  buildings: BuildingFootprint[],
  freq_hz: number,
): BuildingRayHit | null {
  const midLat = (lat1 + lat2) / 2
  const midLon = (lon1 + lon2) / 2
  const midAlt = (alt1 + alt2) / 2

  for (const b of buildings) {
    if (!pointInPolygon(midLat, midLon, b.polygon)) continue
    if (midAlt > b.height_m) continue
    return {
      buildingId: b.id,
      penetration_loss_db: penetrationLossDb(b.material_class, freq_hz),
      obstructed: true,
    }
  }
  return null
}

export function pathBuildingObstructed(
  lat1: number,
  lon1: number,
  alt1: number,
  lat2: number,
  lon2: number,
  alt2: number,
  buildings: BuildingFootprint[],
): boolean {
  const samples = 5
  for (let s = 1; s < samples; s++) {
    const t = s / samples
    const lat = lat1 + (lat2 - lat1) * t
    const lon = lon1 + (lon2 - lon1) * t
    const alt = alt1 + (alt2 - alt1) * t
    for (const b of buildings) {
      if (pointInPolygon(lat, lon, b.polygon) && alt < b.height_m) return true
    }
  }
  return false
}
