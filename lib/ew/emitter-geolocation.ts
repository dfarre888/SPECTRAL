/**
 * OSINT DF triangulation — bearing intersection from two+ passive sensors.
 * Estimated confidence only; not a classified geolocation solver.
 */

export interface DfSensor {
  id: string
  lat: number
  lon: number
  bearing_deg: number
  bearing_error_deg?: number
}

export interface GeolocationFix {
  lat: number
  lon: number
  confidence: 'Assessed' | 'Estimated'
  ellipse_maj_m: number
  ellipse_min_m: number
  method: 'two_bearing_intersection'
}

function toRad(d: number) {
  return (d * Math.PI) / 180
}

/** Two-bearing intersection (spherical approximation). */
export function triangulateEmitters(sensors: DfSensor[]): GeolocationFix | null {
  if (sensors.length < 2) return null
  const a = sensors[0]
  const b = sensors[1]

  const lat1 = toRad(a.lat)
  const lon1 = toRad(a.lon)
  const lat2 = toRad(b.lat)
  const lon2 = toRad(b.lon)
  const brg1 = toRad(a.bearing_deg)
  const brg2 = toRad(b.bearing_deg)

  const dLon = lon2 - lon1
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const latM = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt(
      (Math.cos(lat1) + Math.cos(lat2) * Math.cos(dLon)) ** 2 +
        (Math.cos(lat2) * Math.sin(dLon)) ** 2,
    ),
  )
  const lonM =
    lon1 +
    Math.atan2(
      Math.sin(brg1) + Math.sin(brg2),
      Math.cos(brg1) + Math.cos(brg2),
    ) *
      0.5

  const errA = a.bearing_error_deg ?? 5
  const errB = b.bearing_error_deg ?? 5
  const ellipse = Math.max(200, (errA + errB) * 80)

  return {
    lat: (latM * 180) / Math.PI,
    lon: (lonM * 180) / Math.PI,
    confidence: errA + errB <= 8 ? 'Assessed' : 'Estimated',
    ellipse_maj_m: ellipse,
    ellipse_min_m: ellipse * 0.4,
    method: 'two_bearing_intersection',
  }
}
