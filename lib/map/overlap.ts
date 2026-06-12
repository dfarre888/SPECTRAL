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

export function detectOverlapPairs(
  uasList: PlacedUas[],
  cuasList: PlacedCuas[]
): { uas: PlacedUas; cuas: PlacedCuas }[] {
  const pairs: { uas: PlacedUas; cuas: PlacedCuas }[] = []

  for (const uas of uasList) {
    for (const cuas of cuasList) {
      const distHoriz_m = distanceM(uas.lon, uas.lat, cuas.lon, cuas.lat)
      const uasCentreAlt = uas.discAltitude_m
      const cuasCentreAlt = cuas.terrainAMSL + cuas.asset.defeat_range_m
      const distVert_m = Math.abs(uasCentreAlt - cuasCentreAlt)
      const dist3d_m = Math.hypot(distHoriz_m, distVert_m)
      const touchRadius = uas.lateralRadius_m + cuas.asset.defeat_range_m
      if (dist3d_m < touchRadius) {
        pairs.push({ uas, cuas })
      }
    }
  }

  return pairs
}

export function buildOverlapVolume(
  uas: PlacedUas,
  cuas: PlacedCuas,
  effectiveness_pct: number,
  is_immune: boolean
): OverlapVolume {
  const dist_m = distanceM(uas.lon, uas.lat, cuas.lon, cuas.lat)
  const radius_m = Math.max(
    50,
    (uas.lateralRadius_m + cuas.asset.defeat_range_m - dist_m) / 2
  )
  const isDefeat = is_immune || effectiveness_pct >= 50
  const pct = is_immune ? 100 : effectiveness_pct

  return {
    id: `overlap-${uas.instanceId}-${cuas.instanceId}`,
    uasInstanceId: uas.instanceId,
    cuasInstanceId: cuas.instanceId,
    lon: (uas.lon + cuas.lon) / 2,
    lat: (uas.lat + cuas.lat) / 2,
    alt_m: (uas.terrainAMSL + cuas.terrainAMSL) / 2 + radius_m / 2,
    radius_m,
    effectiveness_pct: pct,
    isDefeat,
    label: isDefeat
      ? `DEFEAT ZONE — ${pct}% Pk`
      : `SURVIVABLE — ${pct}% Pk`,
  }
}
