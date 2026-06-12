/** Segments around combat disc / defeat sphere perimeter walls. */
export const ENVELOPE_WALL_SEGMENTS = 48

/** Horizontal ring sample points (closed loop — first point not repeated at end). */
export function envelopePerimeterPoints(
  lon: number,
  lat: number,
  radius_m: number,
  segments = ENVELOPE_WALL_SEGMENTS,
): { lon: number; lat: number }[] {
  const cosLat = Math.cos((lat * Math.PI) / 180)
  const mPerDegLon = 111320 * Math.max(cosLat, 0.01)
  const mPerDegLat = 110540
  const points: { lon: number; lat: number }[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI
    const dx = (radius_m * Math.cos(angle)) / mPerDegLon
    const dy = (radius_m * Math.sin(angle)) / mPerDegLat
    points.push({ lon: lon + dx, lat: lat + dy })
  }
  return points
}

export function uniformWallTerrain(
  segments: number,
  terrainAMSL: number,
): number[] {
  return Array.from({ length: segments }, () => terrainAMSL)
}
