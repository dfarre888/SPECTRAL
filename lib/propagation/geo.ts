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

/** Great-circle destination from lat/lon, distance (m), bearing (deg clockwise from north). */
export function destinationPointM(
  lat: number,
  lon: number,
  distanceM: number,
  bearingDeg: number,
): { lat: number; lon: number } {
  const δ = distanceM / R_EARTH
  const θ = (bearingDeg * Math.PI) / 180
  const φ1 = (lat * Math.PI) / 180
  const λ1 = (lon * Math.PI) / 180

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  )
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    )

  return {
    lat: (φ2 * 180) / Math.PI,
    lon: ((((λ2 * 180) / Math.PI) + 540) % 360) - 180,
  }
}

/** Offset ~1 km in a random compass bearing (laydown spacing). */
export function offsetApprox1Km(
  lat: number,
  lon: number,
  bearingDeg = Math.random() * 360,
): { lat: number; lon: number; bearingDeg: number } {
  const pt = destinationPointM(lat, lon, 1000, bearingDeg)
  return { ...pt, bearingDeg }
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
