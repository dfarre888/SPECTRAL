import { analyzePropagation } from '@/lib/propagation/analyze'
import { offsetBearingM } from '@/lib/map/terrain-masking'
import { haversineM } from '@/lib/propagation/geo'

export interface Waypoint {
  lat: number
  lon: number
  alt_m: number
}

export interface PathSegmentSinr {
  fromIndex: number
  toIndex: number
  distance_m: number
  jam_to_signal_db: number | null
  los_state: string
  viable: boolean
}

/** Per-segment J/S along a flight path vs a fixed jammer (HTZ-style connectivity). */
export function analyzeFlightPathSinr(
  waypoints: Waypoint[],
  jammer: { lat: number; lon: number; alt_m: number; erp_dbm: number; freq_hz: number },
): PathSegmentSinr[] {
  if (waypoints.length < 2) return []

  const segments: PathSegmentSinr[] = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    const dist = haversineM(a.lat, a.lon, b.lat, b.lon)
    const mid = offsetBearingM(a.lon, a.lat, 0, dist / 2)
    const midAlt = (a.alt_m + b.alt_m) / 2

    const prop = analyzePropagation({
      emitter: {
        position: { lat: jammer.lat, lon: jammer.lon, alt_m: jammer.alt_m },
        freq_hz: jammer.freq_hz,
        erp_dbm: jammer.erp_dbm,
      },
      receiver: {
        position: { lat: mid.lat, lon: mid.lon, alt_m: midAlt },
        sensitivity_dbm: -90,
      },
      jammer_erp_dbm: jammer.erp_dbm,
    })

    const jts = prop.jam_to_signal_db
    segments.push({
      fromIndex: i,
      toIndex: i + 1,
      distance_m: dist,
      jam_to_signal_db: jts,
      los_state: prop.los_state,
      viable: jts == null || jts >= 3,
    })
  }
  return segments
}
