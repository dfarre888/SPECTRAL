import { BLUE_RADARS } from '@/data/seed-radars-blue'
import { RED_RADARS } from '@/data/seed-radars-red'
import { EXTRA_RADARS } from '@/data/seed-radars-extra'
import { classRangeKm, mapUasToTargetClass } from '@/lib/map/laydown-evaluation'
import { segmentIntersectsAny } from '@/lib/map/mission-path-graph'
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import { maskedByEarthBulge, maskedByRadioHorizon } from '@/lib/map/radio-horizon'
import type { MapUasAsset, OverlapVolume, PlacedCuas, PlacedEffector, PlacedRadar } from '@/lib/map/types'
import { haversineM } from '@/lib/propagation/geo'
import { detectionFieldEngine } from '@/lib/spectral/detectionFieldEngine'
import { placedRadarsToEmitters } from '@/lib/spectral/emitter-bridge'
import { getRcsFacets, type RcsFacets } from '@/lib/spectral/detectionPhysicsConstants'
import { inferRcsCategoryFromAsset } from '@/lib/spectral/rcs-category-map'
import type { RadarSystem, TargetClass } from '@/lib/spectrum/radar-types'

const RADAR_BY_ID = new Map<string, RadarSystem>(
  [...RED_RADARS, ...BLUE_RADARS, ...EXTRA_RADARS].map((r) => [r.id, r]),
)


export const PD_THRESHOLD_PCT = 25
export const PD_EXPOSURE_WEIGHT = 8
export const PK_EXPOSURE_WEIGHT = 12

/** Risk gradient for mission path segment polylines (0–100% Pk or Pd). */
export function pathMetricColorHex(pct: number): string {
  const t = Math.min(100, Math.max(0, pct))
  if (t < 15) return '#22C55E'
  if (t < 30) return '#84CC16'
  if (t < 50) return '#EAB308'
  if (t < 70) return '#F97316'
  return '#EF4444'
}

export interface ThreatCircle {
  id: string
  kind: 'cuas' | 'radar' | 'effector'
  lon: number
  lat: number
  radius_m: number
  alt_m: number
  cuasInstanceId?: string
  /** Max engagement altitude AMSL offset above alt_m (effectors only). */
  alt_max_m?: number
  /** Class detection range for radar PD scoring. */
  classRangeKm?: number
}

export type PathScoringOptions = { heading_deg?: number; rcsOverride?: RcsFacets }

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

function pkForCuas(cuasInstanceId: string | undefined, overlapVolumes?: OverlapVolume[]): number {
  if (!cuasInstanceId) return 50
  return overlapVolumes?.find((o) => o.cuasInstanceId === cuasInstanceId)?.effectiveness_pct ?? 50
}

/** Assessed default Pk for SAM/BMD effector engagement dome when no per-pair overlap exists. */
function pkForEffector(eff: PlacedEffector): number {
  return eff.asset.pk_estimate_pct ?? 75
}

export function estimatePdAtPoint(
  lon: number,
  lat: number,
  altM: number,
  terrainAMSL: number,
  asset: MapUasAsset,
  placedRadars: PlacedRadar[],
  emcon: boolean,
  options?: PathScoringOptions,
): number {
  const emitters = placedRadarsToEmitters(placedRadars, asset)
  if (emitters.length === 0) return 0

  const category = inferRcsCategoryFromAsset(asset)
  const { facets: fallback } = getRcsFacets(asset.id, category)
  const sample = detectionFieldEngine.pdAtPoint(
    {
      lon,
      lat,
      alt_m: altM,
      terrainAMSL,
      heading_deg: options?.heading_deg ?? 0,
    },
    asset.id,
    fallback,
    emitters,
    { categoryFallback: category, rcsOverride: options?.rcsOverride, emcon },
  )
  return Math.min(100, Math.round(sample.maxPd * 100))
}

export { maskedByEarthBulge, maskedByRadioHorizon } from '@/lib/map/radio-horizon'


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
  placedEffectors: PlacedEffector[] = [],
  overlapVolumes?: OverlapVolume[],
  emcon = false,
  options?: PathScoringOptions,
  alt2_m?: number,
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
    const sampleAlt = alt2_m != null ? alt_m + t * (alt2_m - alt_m) : alt_m

    const pd = estimatePdAtPoint(lon, lat, sampleAlt, terrainAMSL, asset, placedRadars, emcon, options)
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

    for (const eff of placedEffectors) {
      const horiz_m = haversineM(eff.lat, eff.lon, lat, lon)
      const effAlt = eff.terrainAMSL + TERRAIN_SURFACE_AGL_M
      const radius_m = eff.asset.engagement_dome_km * 1000
      const altMax_m = eff.asset.alt_max_km * 1000
      if (sampleAlt > effAlt + altMax_m) continue
      if (Math.hypot(horiz_m, Math.abs(sampleAlt - effAlt)) <= radius_m) {
        inDefeatRange = true
        const pk = pkForEffector(eff)
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
      alt_max_m: e.asset.alt_max_km * 1000,
    })
  }
  return out
}

/** PD routing uses class detection range — not the tactical display dome. */
export const DISPLAY_CHUNK_M = 400

export interface PathSegmentChunk {
  lon1: number
  lat1: number
  lon2: number
  lat2: number
  alt_m: number
  alt2_m?: number
  metricPct: number
}

/** Split a waypoint segment into ~400m chunks for per-chunk risk gradient coloring. */
export function subdivideSegmentForDisplay(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  alt_m: number,
  terrainAMSL: number,
  asset: MapUasAsset,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  overlapVolumes: OverlapVolume[] | undefined,
  emcon: boolean,
  objective: 'pk' | 'pd' | 'combined',
  options?: PathScoringOptions,
  alt2_m?: number,
  chunkM = DISPLAY_CHUNK_M,
): PathSegmentChunk[] {
  const totalM = haversineM(lat1, lon1, lat2, lon2)
  if (totalM < chunkM * 1.5) {
    const score = scorePathSegment(
      lon1,
      lat1,
      lon2,
      lat2,
      alt_m,
      terrainAMSL,
      asset,
      placedCuas,
      placedRadars,
      placedEffectors,
      overlapVolumes,
      emcon,
      options,
      alt2_m,
    )
    const metricPct =
      objective === 'combined'
        ? Math.max(score.maxPk_pct, score.maxPd_pct)
        : objective === 'pk'
          ? score.maxPk_pct
          : score.maxPd_pct
    return [{ lon1, lat1, lon2, lat2, alt_m, alt2_m, metricPct }]
  }

  const chunks: PathSegmentChunk[] = []
  const n = Math.ceil(totalM / chunkM)
  for (let i = 0; i < n; i++) {
    const t0 = i / n
    const t1 = (i + 1) / n
    const cLon1 = lon1 + t0 * (lon2 - lon1)
    const cLat1 = lat1 + t0 * (lat2 - lat1)
    const cLon2 = lon1 + t1 * (lon2 - lon1)
    const cLat2 = lat1 + t1 * (lat2 - lat1)
    const cAlt1 = alt2_m != null ? alt_m + t0 * (alt2_m - alt_m) : alt_m
    const cAlt2 = alt2_m != null ? alt_m + t1 * (alt2_m - alt_m) : alt_m
    const score = scorePathSegment(
      cLon1,
      cLat1,
      cLon2,
      cLat2,
      cAlt1,
      terrainAMSL,
      asset,
      placedCuas,
      placedRadars,
      placedEffectors,
      overlapVolumes,
      emcon,
      options,
      cAlt2,
    )
    const metricPct =
      objective === 'combined'
        ? Math.max(score.maxPk_pct, score.maxPd_pct)
        : objective === 'pk'
          ? score.maxPk_pct
          : score.maxPd_pct
    chunks.push({
      lon1: cLon1,
      lat1: cLat1,
      lon2: cLon2,
      lat2: cLat2,
      alt_m: cAlt1,
      alt2_m: cAlt2,
      metricPct,
    })
  }
  return chunks
}

export function collectPdThreats(
  placedRadars: PlacedRadar[],
  asset: MapUasAsset,
  placedEffectors: PlacedEffector[] = [],
): ThreatCircle[] {
  const tc = mapUasToTargetClass(asset)
  const out: ThreatCircle[] = []
  const seenRadarIds = new Set<string>()

  for (const r of placedRadars) {
    const seed = radarSeed(r.asset.id)
    const classRangeKmVal = seed ? classRangeKm(seed, tc) : r.asset.detection_range_km
    const radius_m = Math.min(classRangeKmVal, r.asset.detection_range_km) * 1000
    if (radius_m < 500) continue
    seenRadarIds.add(r.asset.id)
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

  for (const eff of placedEffectors) {
    for (const linked of eff.asset.linkedRadars) {
      if (seenRadarIds.has(linked.id)) continue
      const seed = radarSeed(linked.id)
      const classRangeKmVal = seed ? classRangeKm(seed, tc) : linked.detection_range_km
      const radius_m = Math.min(classRangeKmVal, linked.detection_range_km) * 1000
      if (radius_m < 500) continue
      seenRadarIds.add(linked.id)
      out.push({
        id: `cue-${eff.instanceId}-${linked.id}`,
        kind: 'radar',
        lon: eff.lon,
        lat: eff.lat,
        radius_m,
        alt_m: eff.terrainAMSL + TERRAIN_SURFACE_AGL_M,
        classRangeKm: classRangeKmVal,
      })
    }
  }

  return out
}

/** Union of Pk and Pd threat circles for combined routing / replan checks. */
export function collectCombinedThreats(
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  asset: MapUasAsset,
): ThreatCircle[] {
  return [
    ...collectPkThreats(placedCuas, placedEffectors),
    ...collectPdThreats(placedRadars, asset, placedEffectors),
  ]
}

/** True if any leg of the mission polyline intersects a threat envelope. */
export function missionPathIntersectsThreats(
  waypoints: { lon: number; lat: number }[],
  threats: ThreatCircle[],
): boolean {
  if (waypoints.length < 2 || threats.length === 0) return false
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]
    const b = waypoints[i]
    if (segmentIntersectsAny(a.lon, a.lat, b.lon, b.lat, threats)) return true
  }
  return false
}
