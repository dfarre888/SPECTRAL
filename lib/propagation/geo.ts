const R_EARTH = 6371000

export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function distance3dM(
  lat1: number,
  lon1: number,
  alt1: number,
  lat2: number,
  lon2: number,
  alt2: number,
): number {
  const h = haversineM(lat1, lon1, lat2, lon2)
  return Math.hypot(h, alt2 - alt1)
}
