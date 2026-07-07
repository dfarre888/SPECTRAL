import { BLUE_RADARS } from '@/data/seed-radars-blue'
import { RED_RADARS } from '@/data/seed-radars-red'
import { EXTRA_RADARS } from '@/data/seed-radars-extra'
import { classRangeKm, mapUasToTargetClass } from '@/lib/map/laydown-evaluation'
import { TERRAIN_MASK_CLEARANCE_M } from '@/lib/map/terrain-masking'
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import type { MapUasAsset, OverlapVolume, PlacedCuas, PlacedEffector, PlacedRadar } from '@/lib/map/types'
import { haversineM } from '@/lib/propagation/geo'
import type { RadarSystem, TargetClass } from '@/lib/spectrum/radar-types'

const RADAR_BY_ID = new Map<string, RadarSystem>(
  [...RED_RADARS, ...BLUE_RADARS, ...EXTRA_RADARS].map((r) => [r.id, r]),
)

/** Effective earth radius (4/3 model) for radio horizon. */
const R_EFF_M = 6371000 * (4 / 3)

export const PD_THRESHOLD_PCT = 25
export const PD_EXPOSURE_WEIGHT = 8
export const PK_EXPOSURE_WEIGHT = 12

export interface ThreatCircle {
  id: string
  kind: 'cuas' | 'radar' | 'effector'
  lon: number
  lat: number
  radius_m: number
  alt_m: number
  cuasInstanceId?: string
  /** Class detection range for radar PD scoring. */
  classRangeKm?: number
}

export interface PathSegmentScore {
  lon1: number
  lat1: number
  lon2: number
  lat2: number
  alt_m: number
  distance_km: number
  maxPk_pct: number
  maxPd_pct: number
  inDefeatRange: boolean
  inDetectionRange: boolean
  /** Integrated exposure: avg(probability) × distance_km */
  pkExposure: number
  pdExposure: number
}

function radarSeed(id: string): RadarSystem | undefined {
  return RADAR_BY_ID.get(id)
}

function radarCanDetect(
  seed: RadarSystem,
  tc: TargetClass,
  distanceKm: number,
  altKm: number,
): boolean {
  if (seed.cannot_detect.includes(tc)) return false
  if (!seed.can_detect.includes(tc)) return false
  if (distanceKm > classRangeKm(seed, tc)) return false
  if (seed.altitude_ceiling_km != null && altKm > seed.altitude_ceiling_km) return false
  return true
}

/** Beyond radio horizon — no line-of-sight to target altitude. */
export function maskedByRadioHorizon(
  radarAltM: number,
  targetAltM: number,
  rangeM: number,
): boolean {
  const hR = Math.max(radarAltM, 1)
  const hT = Math.max(targetAltM, 1)
  const maxRangeM =
    Math.sqrt(2 * R_EFF_M * hR) + Math.sqrt(2 * R_EFF_M * hT)
  return rangeM > maxRangeM * 1.02
}

/** Earth-curvature bulge along a ray — low flyers may sit in dead ground. */
export function maskedByEarthBulge(
  radarAltM: number,
  targetAltM: number,
  rangeM: number,
  terrainAMSL: number,
): boolean {
  if (rangeM < 80) return false
  const steps = Math.max(4, Math.ceil(rangeM / 400))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const d = rangeM * t
    const bulgeM = (d * (rangeM - d)) / (2 * R_EFF_M)
    const lineAltM = radarAltM + t * (targetAltM - radarAltM)
    const terrainAtSample = terrainAMSL + TERRAIN_SURFACE_AGL_M
    if (lineAltM < bulgeM + terrainAtSample + TERRAIN_MASK_CLEARANCE_M) {
      return true
    }
  }
  return false
}

function pkForCuas(cuasInstanceId: string | undefined, overlapVolumes?: OverlapVolume[]): number {
  if (!cuasInstanceId) return 50
  return overlapVolumes?.find((o) => o.cuasInstanceId === cuasInstanceId)?.effectiveness_pct ?? 50
}

export function estimatePdAtPoint(
  lon: number,
  lat: number,
  altM: number,
  terrainAMSL: number,
  asset: MapUasAsset,
  placedRadars: PlacedRadar[],
  emcon: boolean,
): number {
  const tc = mapUasToTargetClass(asset)
  const altKm = altM / 1000
  let maxPd = 0

  for (const radar of placedRadars) {
    const seed = radarSeed(radar.asset.id)
    if (!seed) continue
    const rangeM = haversineM(radar.lat, radar.lon, lat, lon)
    const rangeKm = rangeM / 1000
    const classRange = classRangeKm(seed, tc)
    if (rangeKm > classRange) continue

    const radarAltM = radar.terrainAMSL + TERRAIN_SURFACE_AGL_M
    if (maskedByRadioHorizon(radarAltM, altM, rangeM)) continue
    if (maskedByEarthBulge(radarAltM, altM, rangeM, terrainAMSL)) continue
    if (!radarCanDetect(seed, tc, rangeKm, altKm)) continue

    const rangeRatio = rangeKm / Math.max(classRange, 0.1)
    let pd = Math.round(100 * Math.max(0, 1 - rangeRatio ** 1.4))
    const agl = altM - terrainAMSL
    if (agl <= 60) pd = Math.round(pd * 0.82)
    if (agl <= 35) pd = Math.round(pd * 0.72)
    if (emcon) pd = Math.round(pd * 0.38)
    maxPd = Math.max(maxPd, pd)
  }

  return Math.min(100, maxPd)
}

export function scorePathSegment(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  alt_m: number,
  terrainAMSL: number,
  asset: MapUasAsset,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  overlapVolumes?: OverlapVolume[],
  emcon = false,
): PathSegmentScore {
  const distance_km = haversineM(lat1, lon1, lat2, lon2) / 1000
  let maxPk_pct = 0
  let maxPd_pct = 0
  let inDefeatRange = false
  let inDetectionRange = false

  const samples = distance_km > 2 ? 5 : 3
  let pkSum = 0
  let pdSum = 0

  for (let s = 0; s < samples; s++) {
    const t = s / (samples - 1)
    const lon = lon1 + t * (lon2 - lon1)
    const lat = lat1 + t * (lat2 - lat1)
    const sampleAlt = alt_m

    const pd = estimatePdAtPoint(lon, lat, sampleAlt, terrainAMSL, asset, placedRadars, emcon)
    maxPd_pct = Math.max(maxPd_pct, pd)
    if (pd > 0) inDetectionRange = true
    pdSum += pd

    for (const cuas of placedCuas) {
      const horiz_m = haversineM(cuas.lat, cuas.lon, lat, lon)
      const cuasAlt = cuas.terrainAMSL + TERRAIN_SURFACE_AGL_M
      if (Math.hypot(horiz_m, Math.abs(sampleAlt - cuasAlt)) <= cuas.asset.defeat_range_m) {
        inDefeatRange = true
        const pk = pkForCuas(cuas.instanceId, overlapVolumes)
        maxPk_pct = Math.max(maxPk_pct, pk)
        pkSum += pk
      }
    }
  }

  const avgPk = inDefeatRange ? pkSum / samples : 0
  const avgPd = inDetectionRange ? pdSum / samples : 0

  return {
    lon1,
    lat1,
    lon2,
    lat2,
    alt_m,
    distance_km,
    maxPk_pct,
    maxPd_pct,
    inDefeatRange,
    inDetectionRange,
    pkExposure: (avgPk / 100) * distance_km,
    pdExposure: (avgPd / 100) * distance_km,
  }
}

export function collectPkThreats(
  placedCuas: PlacedCuas[],
  placedEffectors: PlacedEffector[],
): ThreatCircle[] {
  const out: ThreatCircle[] = []
  for (const c of placedCuas) {
    out.push({
      id: c.instanceId,
      kind: 'cuas',
      lon: c.lon,
      lat: c.lat,
      radius_m: c.asset.defeat_range_m,
      alt_m: c.terrainAMSL + TERRAIN_SURFACE_AGL_M,
      cuasInstanceId: c.instanceId,
    })
  }
  for (const e of placedEffectors) {
    out.push({
      id: e.instanceId,
      kind: 'effector',
      lon: e.lon,
      lat: e.lat,
      radius_m: e.asset.engagement_dome_km * 1000,
      alt_m: e.terrainAMSL + TERRAIN_SURFACE_AGL_M,
    })
  }
  return out
}

/** PD routing uses class detection range — not the tactical display dome. */
export function collectPdThreats(
  placedRadars: PlacedRadar[],
  asset: MapUasAsset,
): ThreatCircle[] {
  const tc = mapUasToTargetClass(asset)
  const out: ThreatCircle[] = []
  for (const r of placedRadars) {
    const seed = radarSeed(r.asset.id)
    const classRangeKmVal = seed ? classRangeKm(seed, tc) : r.asset.detection_range_km
    const radius_m = Math.min(classRangeKmVal, r.asset.detection_range_km) * 1000
    if (radius_m < 500) continue
    out.push({
      id: r.instanceId,
      kind: 'radar',
      lon: r.lon,
      lat: r.lat,
      radius_m,
      alt_m: r.terrainAMSL + TERRAIN_SURFACE_AGL_M,
      classRangeKm: classRangeKmVal,
    })
  }
  return out
}
