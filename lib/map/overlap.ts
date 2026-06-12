import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'

function distanceM(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * 3D distance from UAS combat point to C-UAS emitter epicenter.
 * Uses disc altitude (combat envelope height) vs C-UAS terrain centroid.
 */
export function uasToCuasDistance3dM(uas: PlacedUas, cuas: PlacedCuas): number {
  const distHoriz_m = distanceM(uas.lon, uas.lat, cuas.lon, cuas.lat)
  const cuasAlt = cuas.terrainAMSL + TERRAIN_SURFACE_AGL_M
  const uasAlt = Number.isFinite(uas.discAltitude_m)
    ? uas.discAltitude_m
    : uas.terrainAMSL + uas.asset.max_altitude_agl_m
  const distVert_m = Math.abs(uasAlt - cuasAlt)
  return Math.hypot(distHoriz_m, distVert_m)
}

/**
 * Pair qualifies when the UAS is inside the C-UAS defeat sphere (3D),
 * not when the UAS ferry disc merely overlaps in plan view.
 * Operations: pair may still be propagation-gated in adjudication service.
 */
export function detectOverlapPairs(
  uasList: PlacedUas[],
  cuasList: PlacedCuas[],
): { uas: PlacedUas; cuas: PlacedCuas }[] {
  const pairs: { uas: PlacedUas; cuas: PlacedCuas }[] = []

  for (const uas of uasList) {
    for (const cuas of cuasList) {
      const dist3d_m = uasToCuasDistance3dM(uas, cuas)
      if (dist3d_m <= cuas.asset.defeat_range_m) {
        pairs.push({ uas, cuas })
      }
    }
  }

  return pairs
}

/**
 * Kill-zone visual = C-UAS defeat hemisphere at the emitter (same geometry as orange dome).
 * Defeat Matrix Pk drives colour (red ≥50%, green <50%).
 */
export function buildOverlapVolume(
  uas: PlacedUas,
  cuas: PlacedCuas,
  effectiveness_pct: number,
  is_immune: boolean,
): OverlapVolume {
  const isDefeat = is_immune || effectiveness_pct >= 50
  const pct = is_immune ? 100 : effectiveness_pct
  const defeatRange_m = cuas.asset.defeat_range_m

  return {
    id: `overlap-${uas.instanceId}-${cuas.instanceId}`,
    uasInstanceId: uas.instanceId,
    cuasInstanceId: cuas.instanceId,
    lon: cuas.lon,
    lat: cuas.lat,
    alt_m: cuas.terrainAMSL + TERRAIN_SURFACE_AGL_M,
    radius_m: defeatRange_m,
    effectiveness_pct: pct,
    isDefeat,
    label: isDefeat
      ? `DEFEAT ZONE — ${pct}% Pk`
      : `SURVIVABLE — ${pct}% Pk`,
  }
}
