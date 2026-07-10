import {
  collectPdThreats,
  collectPkThreats,
  estimatePdAtPoint,
  PD_THRESHOLD_PCT,
  scorePathSegment,
  type ThreatCircle,
} from '@/lib/map/mission-path-scoring'
import {
  findOptimalRoute,
  segmentIntersectsThreat,
  trimRouteToRange,
  type RouteObjective,
} from '@/lib/map/mission-path-graph'
import type {
  MapUasAsset,
  MissionPlan,
  MissionRouteObjective,
  MissionWaypoint,
  OverlapVolume,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
} from '@/lib/map/types'
import type { RcsFacets } from '@/lib/spectral/detectionPhysicsConstants'

export { scorePathSegment, PD_THRESHOLD_PCT } from '@/lib/map/mission-path-scoring'
export type { PathSegmentScore } from '@/lib/map/mission-path-scoring'

export const DEFAULT_AGL_M = 25
export const PK_THRESHOLD_PCT = 20

export interface MissionPathPlannerInput {
  startLon: number
  startLat: number
  startTerrainAMSL: number
  goalLon: number
  goalLat: number
  goalTerrainAMSL: number
  goalKind: 'target' | 'aoi'
  asset: MapUasAsset
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  emcon: boolean
  routeObjective?: MissionRouteObjective
  overlapVolumes?: OverlapVolume[]
  rcsOverride?: RcsFacets
  heading_deg?: number
}

function supportsLowFlight(asset: MapUasAsset): boolean {
  return asset.max_altitude_agl_m <= 500 || asset.category === 'FPV' || asset.category === 'tactical'
}

function ceilingAMSL(terrainAMSL: number, asset: MapUasAsset): number {
  return asset.altitude_reference === 'AMSL'
    ? asset.max_altitude_agl_m
    : terrainAMSL + asset.max_altitude_agl_m
}

function cruiseAltitudeM(
  terrainAMSL: number,
  asset: MapUasAsset,
  objective: RouteObjective,
): number {
  const ceil = ceilingAMSL(terrainAMSL, asset)
  if (objective === 'pd') {
    const napAgl = supportsLowFlight(asset)
      ? Math.min(asset.max_altitude_agl_m * 0.12, 80)
      : Math.min(asset.max_altitude_agl_m * 0.08, 120)
    return Math.min(ceil, terrainAMSL + Math.max(DEFAULT_AGL_M, napAgl))
  }
  const cruiseAgl = Math.min(asset.max_altitude_agl_m * 0.42, 4000)
  return Math.min(ceil, terrainAMSL + cruiseAgl)
}

function assignAltitude(
  lon: number,
  lat: number,
  terrainAMSL: number,
  asset: MapUasAsset,
  pdThreats: ThreatCircle[],
  pkThreats: ThreatCircle[],
  objective: RouteObjective,
  isTerminal: boolean,
  emcon: boolean,
  placedRadars: PlacedRadar[],
): number {
  const ceil = ceilingAMSL(terrainAMSL, asset)
  let alt = cruiseAltitudeM(terrainAMSL, asset, objective)

  if (objective === 'pd') {
    for (const t of pdThreats) {
      const horiz = haversineM(t.lat, t.lon, lat, lon)
      if (horiz > t.radius_m) continue
      alt = Math.min(alt, terrainAMSL + DEFAULT_AGL_M)
    }
    const pd = estimatePdAtPoint(lon, lat, alt, terrainAMSL, asset, placedRadars, emcon)
    if (pd > 40 && !supportsLowFlight(asset)) {
      alt = Math.min(alt, terrainAMSL + Math.min(asset.max_altitude_agl_m * 0.05, 60))
    }
  }

  if (objective === 'pk') {
    for (const t of pkThreats) {
      if (t.kind !== 'cuas') continue
      const horiz = haversineM(t.lat, t.lon, lat, lon)
      if (horiz > t.radius_m) continue
      const cuasAlt = t.alt_m
      if (horiz < t.radius_m * 0.55) {
        alt = Math.min(alt, cuasAlt + t.radius_m * 0.55 + 40)
      }
    }
  }

  if (isTerminal) {
    alt = Math.max(alt, terrainAMSL + Math.min(asset.max_altitude_agl_m * 0.35, 120))
  }

  return Math.min(alt, ceil)
}

function transitSpeedKmh(asset: MapUasAsset, napOfEarth: boolean): number {
  const base = Math.max(asset.max_speed_kmh, 1)
  return napOfEarth ? base * 0.72 : base
}

function waypointIdForIndex(idx: number, lon: number, lat: number): string {
  return `wp-${idx}-${lon.toFixed(5)}-${lat.toFixed(5)}`
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function planMissionPath(input: MissionPathPlannerInput): MissionPlan {
  const objective: RouteObjective = input.routeObjective ?? 'pd'
  const pdThreats = collectPdThreats(input.placedRadars, input.asset)
  const pkThreats = collectPkThreats(input.placedCuas, input.placedEffectors)
  const hardThreats = objective === 'pk' ? pkThreats : pdThreats

  const cruiseAlt = cruiseAltitudeM(input.startTerrainAMSL, input.asset, objective)
  const napOfEarth = objective === 'pd' || supportsLowFlight(input.asset)
  const speed = transitSpeedKmh(input.asset, napOfEarth)

  const routePoints = trimRouteToRange(
    findOptimalRoute(
      { lon: input.startLon, lat: input.startLat },
      { lon: input.goalLon, lat: input.goalLat },
      objective,
      input.asset,
      input.placedCuas,
      input.placedRadars,
      input.placedEffectors,
      input.startTerrainAMSL,
      cruiseAlt,
      input.overlapVolumes,
      input.emcon,
      input.rcsOverride
        ? { heading_deg: input.heading_deg ?? 0, rcsOverride: input.rcsOverride }
        : undefined,
    ),
    input.asset.max_range_km,
  )

  const waypoints = routePoints.map((pt, idx) => {
    const isStart = idx === 0
    const isGoal = idx === routePoints.length - 1
    const terrain = isStart
      ? input.startTerrainAMSL
      : isGoal
        ? input.goalTerrainAMSL
        : input.startTerrainAMSL
    const kind = isStart
      ? 'start'
      : isGoal
        ? input.goalKind === 'target'
          ? 'goal'
          : 'terminal'
        : 'detour'
    return {
      id: waypointIdForIndex(idx, pt.lon, pt.lat),
      lon: pt.lon,
      lat: pt.lat,
      terrainAMSL: terrain,
      alt_m: assignAltitude(
        pt.lon,
        pt.lat,
        terrain,
        input.asset,
        pdThreats,
        pkThreats,
        objective,
        isGoal,
        input.emcon,
        input.placedRadars,
      ),
      speed_kmh: isGoal ? speed * 0.85 : speed,
      kind,
    } as MissionWaypoint
  })

  let totalDistance_km = 0
  let maxPk_pct = 0
  let maxPd_pct = 0
  let pdExposure_km = 0
  let pkExposure_km = 0

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const cur = waypoints[i]
    const terrain = (prev.terrainAMSL + cur.terrainAMSL) / 2
    const score = scorePathSegment(
      prev.lon,
      prev.lat,
      cur.lon,
      cur.lat,
      (prev.alt_m + cur.alt_m) / 2,
      terrain,
      input.asset,
      input.placedCuas,
      input.placedRadars,
      input.overlapVolumes,
      input.emcon,
      input.rcsOverride
        ? { heading_deg: input.heading_deg ?? 0, rcsOverride: input.rcsOverride }
        : { heading_deg: input.heading_deg ?? 0 },
    )
    totalDistance_km += score.distance_km
    maxPk_pct = Math.max(maxPk_pct, score.maxPk_pct)
    maxPd_pct = Math.max(maxPd_pct, score.maxPd_pct)
    pdExposure_km += score.pdExposure
    pkExposure_km += score.pkExposure
  }

  const directBlocked = hardThreats.some((t) =>
    segmentIntersectsThreat(input.startLon, input.startLat, input.goalLon, input.goalLat, t),
  )

  const thresholdExceeded =
    objective === 'pd'
      ? maxPd_pct >= PD_THRESHOLD_PCT
      : maxPk_pct >= PK_THRESHOLD_PCT

  let pathMode: MissionPlan['pathMode'] = 'optimized'
  if (directBlocked && thresholdExceeded) {
    pathMode = 'soft-minimize'
  } else if (!directBlocked) {
    pathMode = 'hard-avoid'
  }

  return {
    goalKind: input.goalKind,
    goalLon: input.goalLon,
    goalLat: input.goalLat,
    goalTerrainAMSL: input.goalTerrainAMSL,
    waypoints,
    emcon: input.emcon,
    routeObjective: objective,
    manualOverride: false,
    totalDistance_km: Math.min(totalDistance_km, input.asset.max_range_km),
    maxPk_pct,
    maxPd_pct,
    pdExposure_km,
    pkExposure_km,
    pkThresholdExceeded: maxPk_pct >= PK_THRESHOLD_PCT,
    pdThresholdExceeded: maxPd_pct >= PD_THRESHOLD_PCT,
    pathMode,
    updatedAt: new Date().toISOString(),
  }
}

export function missionWaypointEntityId(uasInstanceId: string, waypointId: string): string {
  return `map-mission-wp-${uasInstanceId}-${waypointId}`
}

export function parseMissionWaypointEntityId(
  entityId: string,
): { uasInstanceId: string; waypointId: string } | null {
  const prefix = 'map-mission-wp-'
  if (!entityId.startsWith(prefix)) return null
  const rest = entityId.slice(prefix.length)
  const sep = rest.indexOf('-wp-')
  if (sep > 0) return { uasInstanceId: rest.slice(0, sep), waypointId: rest.slice(sep + 1) }
  const dash = rest.indexOf('-')
  if (dash <= 0) return null
  return { uasInstanceId: rest.slice(0, dash), waypointId: rest.slice(dash + 1) }
}
