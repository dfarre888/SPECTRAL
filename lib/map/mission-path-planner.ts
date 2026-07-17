import {
  collectPdThreats,
  collectPkThreats,
  estimatePdAtPoint,
  PD_THRESHOLD_PCT,
  scorePathSegment,
  type PathSegmentScore,
  type ThreatCircle,
} from '@/lib/map/mission-path-scoring'
import {
  DETOUR_BUFFER_M,
  detourRouteAroundThreats,
  findOptimalRoute,
  segmentIntersectsAny,
  segmentIntersectsThreat,
  trimRouteToRange,
  type GraphPoint,
  type RouteObjective,
} from '@/lib/map/mission-path-graph'
import { destinationPointM } from '@/lib/propagation/geo'
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
  if (objective === 'pd' || objective === 'combined') {
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
  waypointKind: MissionWaypoint['kind'],
  emcon: boolean,
  placedRadars: PlacedRadar[],
): number {
  const ceil = ceilingAMSL(terrainAMSL, asset)
  let alt = cruiseAltitudeM(terrainAMSL, asset, objective)

  if (objective === 'pd' || objective === 'combined') {
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

  if (objective === 'pk' || objective === 'combined') {
    for (const t of pkThreats) {
      const horiz = haversineM(t.lat, t.lon, lat, lon)
      if (horiz > t.radius_m) continue
      const threatAlt = t.alt_m
      if (t.kind === 'effector' && t.alt_max_m) {
        alt = Math.max(alt, threatAlt + t.alt_max_m + 400)
      } else if (horiz < t.radius_m * 0.55) {
        alt = Math.min(alt, threatAlt + t.radius_m * 0.55 + 40)
      }
    }
  }

  if (waypointKind === 'goal') {
    return terrainAMSL + 2
  }

  if (waypointKind === 'terminal') {
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

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dL = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(dL) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dL)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}


/** Push start point to Pk threat boundary when co-located inside engagement dome. */
export function egressPointIfInsidePkThreat(
  point: GraphPoint,
  pkThreats: ThreatCircle[],
): GraphPoint {
  let lon = point.lon
  let lat = point.lat
  for (const t of pkThreats) {
    const dist = haversineM(t.lat, t.lon, lat, lon)
    if (dist < t.radius_m + DETOUR_BUFFER_M) {
      const brg = bearingDeg(t.lat, t.lon, lat, lon)
      const egress = destinationPointM(t.lat, t.lon, t.radius_m + DETOUR_BUFFER_M, brg)
      lon = egress.lon
      lat = egress.lat
    }
  }
  return { lon, lat }
}

/** Default mission goal when instructor skips the goal dialog or threats are placed after UAS. */
export function inferDefaultMissionGoal(
  startLon: number,
  startLat: number,
  maxRange_km: number,
  threats: { lon: number; lat: number }[],
): { goalLon: number; goalLat: number } {
  const rangeM = Math.min(maxRange_km * 1000 * 0.65, 25_000)
  if (threats.length === 0) {
    const pt = destinationPointM(startLat, startLon, rangeM, 90)
    return { goalLon: pt.lon, goalLat: pt.lat }
  }

  const nonColocated = threats.filter(
    (t) => haversineM(startLat, startLon, t.lat, t.lon) >= 500,
  )
  let awayBearing: number
  if (nonColocated.length === 0) {
    awayBearing = 90
  } else {
    const ref = nonColocated[0]
    const towardThreat = bearingDeg(startLat, startLon, ref.lat, ref.lon)
    awayBearing = (towardThreat + 180) % 360
  }
  const pt = destinationPointM(startLat, startLon, rangeM, awayBearing)
  return { goalLon: pt.lon, goalLat: pt.lat }
}

export function defaultRouteObjective(
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
): MissionRouteObjective {
  if (placedCuas.length > 0 || placedRadars.length > 0 || placedEffectors.length > 0) {
    return 'combined'
  }
  return 'pk'
}

/** Insert climb/overflight nodes when a large effector dome blocks the horizontal chord. */
function expandRouteWithEffectorOverflight(
  points: { lon: number; lat: number }[],
  pkThreats: ThreatCircle[],
): { lon: number; lat: number }[] {
  if (points.length < 2 || pkThreats.length === 0) return points
  const expanded: { lon: number; lat: number }[] = [points[0]]
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const blocking = pkThreats.filter(
      (t) =>
        t.kind === 'effector' &&
        segmentIntersectsThreat(a.lon, a.lat, b.lon, b.lat, t),
    )
    for (const t of blocking) {
      const already = expanded.some(
        (p) => haversineM(p.lat, p.lon, t.lat, t.lon) < 300,
      )
      if (!already) expanded.push({ lon: t.lon, lat: t.lat })
    }
    expanded.push(b)
  }
  return expanded
}

export function planMissionPath(input: MissionPathPlannerInput): MissionPlan {
  const objective: RouteObjective =
    input.routeObjective ??
    defaultRouteObjective(input.placedCuas, input.placedRadars, input.placedEffectors)
  const pdThreats = collectPdThreats(input.placedRadars, input.asset, input.placedEffectors)
  const pkThreats = collectPkThreats(input.placedCuas, input.placedEffectors)
  const hardThreats =
    objective === 'pk'
      ? pkThreats
      : objective === 'pd'
        ? pdThreats
        : [...pkThreats, ...pdThreats]

  const cruiseAlt = cruiseAltitudeM(input.startTerrainAMSL, input.asset, objective)
  const napOfEarth = objective === 'pd' || objective === 'combined' || supportsLowFlight(input.asset)
  const speed = transitSpeedKmh(input.asset, napOfEarth)

  const scoringOptions = input.rcsOverride
    ? { heading_deg: input.heading_deg ?? 0, rcsOverride: input.rcsOverride }
    : undefined

  const routingStart = egressPointIfInsidePkThreat(
    { lon: input.startLon, lat: input.startLat },
    pkThreats,
  )

  let rawRoute = findOptimalRoute(
    routingStart,
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
    scoringOptions,
  )

  rawRoute = expandRouteWithEffectorOverflight(rawRoute, pkThreats)

  if (
    rawRoute.length <= 2 &&
    segmentIntersectsAny(
      routingStart.lon,
      routingStart.lat,
      input.goalLon,
      input.goalLat,
      hardThreats,
    )
  ) {
    rawRoute = detourRouteAroundThreats(
      routingStart,
      { lon: input.goalLon, lat: input.goalLat },
      hardThreats,
    )
    rawRoute = expandRouteWithEffectorOverflight(rawRoute, pkThreats)
  }

  const startDiffers =
    haversineM(input.startLat, input.startLon, routingStart.lat, routingStart.lon) > 50
  if (startDiffers) {
    const first = rawRoute[0]
    const dupStart =
      first &&
      haversineM(input.startLat, input.startLon, first.lat, first.lon) < 50
    rawRoute = dupStart
      ? [{ lon: input.startLon, lat: input.startLat }, ...rawRoute.slice(1)]
      : [{ lon: input.startLon, lat: input.startLat }, ...rawRoute]
  }

  const routePoints = trimRouteToRange(rawRoute, input.asset.max_range_km)

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
        kind,
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
  const segmentScores: PathSegmentScore[] = []

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const cur = waypoints[i]
    const terrain = (prev.terrainAMSL + cur.terrainAMSL) / 2
    const score = scorePathSegment(
      prev.lon,
      prev.lat,
      cur.lon,
      cur.lat,
      prev.alt_m,
      terrain,
      input.asset,
      input.placedCuas,
      input.placedRadars,
      input.placedEffectors,
      input.overlapVolumes,
      input.emcon,
      input.rcsOverride
        ? { heading_deg: input.heading_deg ?? 0, rcsOverride: input.rcsOverride }
        : { heading_deg: input.heading_deg ?? 0 },
      cur.alt_m,
    )
    totalDistance_km += score.distance_km
    maxPk_pct = Math.max(maxPk_pct, score.maxPk_pct)
    maxPd_pct = Math.max(maxPd_pct, score.maxPd_pct)
    pdExposure_km += score.pdExposure
    pkExposure_km += score.pkExposure
    segmentScores.push(score)
  }

  const directBlocked = hardThreats.some((t) =>
    segmentIntersectsThreat(input.startLon, input.startLat, input.goalLon, input.goalLat, t),
  )

  const thresholdExceeded =
    objective === 'pd'
      ? maxPd_pct >= PD_THRESHOLD_PCT
      : objective === 'pk'
        ? maxPk_pct >= PK_THRESHOLD_PCT
        : maxPk_pct >= PK_THRESHOLD_PCT || maxPd_pct >= PD_THRESHOLD_PCT

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
    segmentScores,
    updatedAt: new Date().toISOString(),
  }
}

/** Recompute segment Pk/Pd scores after manual waypoint edits (keeps geometry). */
export function rescoreMissionPlan(
  mission: MissionPlan,
  asset: MapUasAsset,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  overlapVolumes?: OverlapVolume[],
  emcon = false,
  rcsOverride?: RcsFacets,
): MissionPlan {
  let totalDistance_km = 0
  let maxPk_pct = 0
  let maxPd_pct = 0
  let pdExposure_km = 0
  let pkExposure_km = 0
  const segmentScores: PathSegmentScore[] = []
  const waypoints = mission.waypoints

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const cur = waypoints[i]
    const terrain = (prev.terrainAMSL + cur.terrainAMSL) / 2
    const score = scorePathSegment(
      prev.lon,
      prev.lat,
      cur.lon,
      cur.lat,
      prev.alt_m,
      terrain,
      asset,
      placedCuas,
      placedRadars,
      placedEffectors,
      overlapVolumes,
      emcon,
      rcsOverride ? { heading_deg: 0, rcsOverride } : { heading_deg: 0 },
      cur.alt_m,
    )
    totalDistance_km += score.distance_km
    maxPk_pct = Math.max(maxPk_pct, score.maxPk_pct)
    maxPd_pct = Math.max(maxPd_pct, score.maxPd_pct)
    pdExposure_km += score.pdExposure
    pkExposure_km += score.pkExposure
    segmentScores.push(score)
  }

  return {
    ...mission,
    totalDistance_km: Math.min(totalDistance_km, asset.max_range_km),
    maxPk_pct,
    maxPd_pct,
    pdExposure_km,
    pkExposure_km,
    pkThresholdExceeded: maxPk_pct >= PK_THRESHOLD_PCT,
    pdThresholdExceeded: maxPd_pct >= PD_THRESHOLD_PCT,
    segmentScores,
    updatedAt: new Date().toISOString(),
  }
}

export function missionPathEntityId(uasInstanceId: string): string {
  return `map-mission-path-${uasInstanceId}`
}

export function missionSegmentEntityId(uasInstanceId: string, segmentIndex: number): string {
  return `map-mission-seg-${uasInstanceId}-${segmentIndex}`
}

export function missionSegmentChunkEntityId(
  uasInstanceId: string,
  segmentIndex: number,
  chunkIndex: number,
): string {
  return `map-mission-seg-${uasInstanceId}-${segmentIndex}-${chunkIndex}`
}

/** Wide invisible pick corridor for one logical segment (edit mode). */
export function missionSegmentPickEntityId(uasInstanceId: string, segmentIndex: number): string {
  return `map-mission-pick-${uasInstanceId}-${segmentIndex}`
}

export function parseMissionPathEntityId(entityId: string): string | null {
  const prefix = 'map-mission-path-'
  if (!entityId.startsWith(prefix)) return null
  return entityId.slice(prefix.length)
}

export function parseMissionSegmentEntityId(
  entityId: string,
): { uasInstanceId: string; segmentIndex: number; chunkIndex?: number } | null {
  const pickPrefix = 'map-mission-pick-'
  if (entityId.startsWith(pickPrefix)) {
    const rest = entityId.slice(pickPrefix.length)
    const dash = rest.lastIndexOf('-')
    if (dash <= 0) return null
    const segmentIndex = Number.parseInt(rest.slice(dash + 1), 10)
    if (!Number.isFinite(segmentIndex)) return null
    return { uasInstanceId: rest.slice(0, dash), segmentIndex }
  }

  const prefix = 'map-mission-seg-'
  if (!entityId.startsWith(prefix)) return null
  const rest = entityId.slice(prefix.length)
  const lastDash = rest.lastIndexOf('-')
  if (lastDash <= 0) return null
  const lastNum = Number.parseInt(rest.slice(lastDash + 1), 10)
  if (!Number.isFinite(lastNum)) return null
  const beforeLast = rest.slice(0, lastDash)
  const secondLastDash = beforeLast.lastIndexOf('-')
  if (secondLastDash <= 0) {
    return { uasInstanceId: beforeLast, segmentIndex: lastNum }
  }
  const secondNum = Number.parseInt(beforeLast.slice(secondLastDash + 1), 10)
  if (Number.isFinite(secondNum)) {
    return {
      uasInstanceId: beforeLast.slice(0, secondLastDash),
      segmentIndex: secondNum,
      chunkIndex: lastNum,
    }
  }
  return { uasInstanceId: beforeLast, segmentIndex: lastNum }
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
