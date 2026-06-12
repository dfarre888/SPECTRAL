import { computePlatformRangeEnvelope } from '@/lib/map/range-declaration'
import type { MapUasAsset } from '@/lib/map/types'

export function formatHHMM(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatMMSS(totalMinutes: number): string {
  const totalSec = Math.max(0, Math.round(totalMinutes * 60))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatCoord(lon: number, lat: number): string {
  return `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`
}

export function formatDiscAltitude(
  asset: MapUasAsset,
  terrainAMSL: number,
  discAltitude_m: number,
): string {
  if (asset.altitude_reference === 'AMSL') {
    return `${Math.round(discAltitude_m)} m AMSL`
  }
  const agl = Math.max(0, discAltitude_m - terrainAMSL)
  return `${Math.round(agl)} m AGL`
}

export function computeUasEnvelope(asset: MapUasAsset, terrainAMSL: number) {
  const range = computePlatformRangeEnvelope(asset, terrainAMSL)
  const ceilingAMSL_m = terrainAMSL + asset.max_altitude_agl_m
  const lateralRadius_m = range.sphereRadiusM
  const cylinderLength_m = asset.max_altitude_agl_m
  const cylinderCentreAlt_m = range.sphereCentreAltM
  const timeToPerimeter_min =
    asset.max_speed_kmh > 0
      ? (range.operationalRadiusKm / asset.max_speed_kmh) * 60
      : 0
  const climbTime_min =
    asset.climb_rate_mpm > 0
      ? asset.max_altitude_agl_m / asset.climb_rate_mpm
      : 0
  const annotationTime_min = Math.max(0, timeToPerimeter_min - climbTime_min)

  return {
    ceilingAMSL_m,
    discAltitude_m: range.discAltitudeM,
    lateralRadius_m,
    cylinderLength_m,
    cylinderCentreAlt_m,
    sphereRadius_m: range.sphereRadiusM,
    sphereCentreAlt_m: range.sphereCentreAltM,
    declaredRange_km: range.declaredRangeKm,
    operationalRange_km: range.operationalRadiusKm,
    timeToPerimeter_min,
    climbTime_min,
    annotationTime_min,
  }
}
