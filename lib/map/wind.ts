import type { MapUasAsset, WindSample } from '@/lib/map/types'

export function effectiveRangeKm(
  asset: MapUasAsset,
  wind: WindSample,
  flightBearingDeg: number
): number {
  const relativeAngleRad =
    ((wind.windDir_deg - flightBearingDeg) * Math.PI) / 180
  const headwindFraction = Math.cos(relativeAngleRad)
  const factor =
    1 - (wind.windSpeed_kmh / Math.max(asset.max_speed_kmh, 1)) * headwindFraction
  return Math.max(0.1, asset.max_range_km * factor)
}
