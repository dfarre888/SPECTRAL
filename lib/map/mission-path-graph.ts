import { destinationPointM, haversineM } from '@/lib/propagation/geo'
import type { MapUasAsset, OverlapVolume, PlacedCuas, PlacedEffector, PlacedRadar } from '@/lib/map/types'
import {
  collectCombinedThreats,
  collectPdThreats,
  collectPkThreats,
  type PathSegmentScore,
  type ThreatCircle,
  PD_EXPOSURE_WEIGHT,
  PK_EXPOSURE_WEIGHT,
  scorePathSegment,
  type PathScoringOptions,
} from '@/lib/map/mission-path-scoring'

export const DETOUR_BUFFER_M = 150
export const MAX_GRAPH_NODES = 64

export type RouteObjective = 'pk' | 'pd' | 'combined'

function routingHardThreats(
  objective: RouteObjective,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  asset: MapUasAsset,
): ThreatCircle[] {
  if (objective === 'pk') return collectPkThreats(placedCuas, placedEffectors)
  if (objective === 'pd') return collectPdThreats(placedRadars, asset, placedEffectors)
  return collectCombinedThreats(placedCuas, placedRadars, placedEffectors, asset)
}

export interface GraphPoint {
  lon: number
  lat: number
}

interface AStarNode {
  idx: number
  g: number
  f: number
  parent: number | null
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dL = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(dL) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dL)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function distPointToSegmentM(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const segLen = haversineM(y1, x1, y2, x2)
  if (segLen < 1) return haversineM(py, px, y1, x1)
  const t = Math.max(
    0,
    Math.min(
      1,
      ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) /
        ((x2 - x1) ** 2 + (y2 - y1) ** 2 + 1e-12),
    ),
  )
  return haversineM(py, px, y1 + t * (y2 - y1), x1 + t * (x2 - x1))
}

export function segmentIntersectsThreat(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  threat: ThreatCircle,
): boolean {
  return distPointToSegmentM(threat.lon, threat.lat, lon1, lat1, lon2, lat2) < threat.radius_m
}

export function segmentIntersectsAny(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  threats: ThreatCircle[],
): boolean {
  return threats.some((t) => segmentIntersectsThreat(lon1, lat1, lon2, lat2, t))
}

function corridorBbox(
  start: GraphPoint,
  goal: GraphPoint,
  padM: number,
): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
  const padDeg = padM / 111000
  return {
    minLon: Math.min(start.lon, goal.lon) - padDeg,
    maxLon: Math.max(start.lon, goal.lon) + padDeg,
    minLat: Math.min(start.lat, goal.lat) - padDeg,
    maxLat: Math.max(start.lat, goal.lat) + padDeg,
  }
}

function threatInCorridor(threat: ThreatCircle, bbox: ReturnType<typeof corridorBbox>): boolean {
  return (
    threat.lon >= bbox.minLon - 0.5 &&
    threat.lon <= bbox.maxLon + 0.5 &&
    threat.lat >= bbox.minLat - 0.5 &&
    threat.lat <= bbox.maxLat + 0.5
  )
}

function flankCandidates(
  start: GraphPoint,
  goal: GraphPoint,
  threat: ThreatCircle,
): GraphPoint[] {
  const midLat = (start.lat + goal.lat) / 2
  const midLon = (start.lon + goal.lon) / 2
  const brgToMid = bearingDeg(threat.lat, threat.lon, midLat, midLon)
  const offset = threat.radius_m + DETOUR_BUFFER_M
  const sides: Array<1 | -1> = [1, -1]
  const points: GraphPoint[] = []

  for (const side of sides) {
    points.push(
      destinationPointM(threat.lat, threat.lon, offset, (brgToMid + 90 * side + 360) % 360),
    )
    points.push(
      destinationPointM(threat.lat, threat.lon, offset * 0.92, (brgToMid + 45 * side + 360) % 360),
    )
  }

  const brgFromStart = bearingDeg(start.lat, start.lon, threat.lat, threat.lon)
  const brgToGoal = bearingDeg(threat.lat, threat.lon, goal.lat, goal.lon)
  for (const side of sides) {
    points.push(
      destinationPointM(threat.lat, threat.lon, offset, (brgFromStart + 90 * side + 360) % 360),
    )
    points.push(
      destinationPointM(threat.lat, threat.lon, offset, (brgToGoal + 90 * side + 360) % 360),
    )
  }

  return points
}

/** Rim samples for large engagement domes — perpendicular flanks fail when domes span the chord. */
function threatRimWaypoints(threat: ThreatCircle, segments = 12): GraphPoint[] {
  const offset = threat.radius_m + DETOUR_BUFFER_M
  const points: GraphPoint[] = []
  for (let i = 0; i < segments; i++) {
    const brg = (360 / segments) * i
    points.push(destinationPointM(threat.lat, threat.lon, offset, brg))
  }
  return points
}

function externalTangentPoints(from: GraphPoint, threat: ThreatCircle): GraphPoint[] {
  const dist = haversineM(from.lat, from.lon, threat.lat, threat.lon)
  const safeRadius = threat.radius_m + DETOUR_BUFFER_M
  if (dist <= safeRadius) {
    const brg = bearingDeg(threat.lat, threat.lon, from.lat, from.lon)
    return [destinationPointM(threat.lat, threat.lon, safeRadius, brg)]
  }
  const brgCenter = bearingDeg(from.lat, from.lon, threat.lat, threat.lon)
  const alphaDeg = (Math.asin(Math.min(1, safeRadius / dist)) * 180) / Math.PI
  const distTangent = Math.sqrt(dist * dist - safeRadius * safeRadius)
  return [
    destinationPointM(from.lat, from.lon, distTangent, (brgCenter + alphaDeg + 360) % 360),
    destinationPointM(from.lat, from.lon, distTangent, (brgCenter - alphaDeg + 360) % 360),
  ]
}

function dedupePoints(points: GraphPoint[], epsilonM = 80): GraphPoint[] {
  const out: GraphPoint[] = []
  for (const p of points) {
    if (out.some((q) => haversineM(q.lat, q.lon, p.lat, p.lon) < epsilonM)) continue
    out.push(p)
  }
  return out
}

function buildGraphNodes(
  start: GraphPoint,
  goal: GraphPoint,
  hardThreats: ThreatCircle[],
): GraphPoint[] {
  const maxRadius = hardThreats.reduce((m, t) => Math.max(m, t.radius_m), 0)
  const bbox = corridorBbox(start, goal, maxRadius + DETOUR_BUFFER_M * 4)
  const relevant = hardThreats.filter((t) => threatInCorridor(t, bbox))

  const candidates: GraphPoint[] = [start, goal]
  for (const threat of relevant) {
    candidates.push(...flankCandidates(start, goal, threat))
    candidates.push(...externalTangentPoints(start, threat))
    candidates.push(...externalTangentPoints(goal, threat))
    if (threat.radius_m > 800) {
      candidates.push(...threatRimWaypoints(threat))
    }
  }

  return dedupePoints(candidates).slice(0, MAX_GRAPH_NODES)
}

function edgeTraversable(
  a: GraphPoint,
  b: GraphPoint,
  hardThreats: ThreatCircle[],
  _objective: RouteObjective,
): boolean {
  if (segmentIntersectsAny(a.lon, a.lat, b.lon, b.lat, hardThreats)) return false
  return true
}

/** When A* cannot reach the goal, pick a single-flank detour instead of a straight line through threats. */
export function detourRouteAroundThreats(
  start: GraphPoint,
  goal: GraphPoint,
  hardThreats: ThreatCircle[],
): GraphPoint[] {
  if (
    hardThreats.length === 0 ||
    !segmentIntersectsAny(start.lon, start.lat, goal.lon, goal.lat, hardThreats)
  ) {
    return [start, goal]
  }

  let bestPath: GraphPoint[] = [start, goal]
  let bestLen = Infinity

  for (const threat of hardThreats) {
    if (!segmentIntersectsThreat(start.lon, start.lat, goal.lon, goal.lat, threat)) continue
    for (const flank of flankCandidates(start, goal, threat)) {
      if (segmentIntersectsAny(start.lon, start.lat, flank.lon, flank.lat, hardThreats)) continue
      if (segmentIntersectsAny(flank.lon, flank.lat, goal.lon, goal.lat, hardThreats)) continue
      const len =
        haversineM(start.lat, start.lon, flank.lat, flank.lon) +
        haversineM(flank.lat, flank.lon, goal.lat, goal.lon)
      if (len < bestLen) {
        bestLen = len
        bestPath = [start, flank, goal]
      }
    }
  }

  return bestPath
}

function edgeCostKm(
  a: GraphPoint,
  b: GraphPoint,
  terrainAMSL: number,
  asset: MapUasAsset,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  overlapVolumes: OverlapVolume[] | undefined,
  objective: RouteObjective,
  emcon: boolean,
  cruiseAltM: number,
  scoringOptions?: PathScoringOptions,
): { cost: number; score: PathSegmentScore } {
  const score = scorePathSegment(
    a.lon,
    a.lat,
    b.lon,
    b.lat,
    cruiseAltM,
    terrainAMSL,
    asset,
    placedCuas,
    placedRadars,
    placedEffectors,
    overlapVolumes,
    emcon,
    scoringOptions,
  )

  const exposure =
    objective === 'combined'
      ? score.pkExposure * PK_EXPOSURE_WEIGHT + score.pdExposure * PD_EXPOSURE_WEIGHT
      : objective === 'pd'
        ? score.pdExposure * PD_EXPOSURE_WEIGHT
        : score.pkExposure * PK_EXPOSURE_WEIGHT

  const penalty =
    objective === 'combined' && (score.maxPk_pct >= 50 || score.maxPd_pct >= 50)
      ? score.distance_km * 0.4
      : objective === 'pd' && score.maxPd_pct >= 50
        ? score.distance_km * 0.35
        : objective === 'pk' && score.maxPk_pct >= 50
          ? score.distance_km * 0.45
          : 0

  return { cost: score.distance_km + exposure + penalty, score }
}

function reconstructPath(cameFrom: Map<number, number>, endIdx: number, nodes: GraphPoint[]): GraphPoint[] {
  const path: GraphPoint[] = []
  let cur: number | undefined = endIdx
  while (cur != null) {
    path.push(nodes[cur])
    cur = cameFrom.get(cur)
  }
  path.reverse()
  return path
}

export function findOptimalRoute(
  start: GraphPoint,
  goal: GraphPoint,
  objective: RouteObjective,
  asset: MapUasAsset,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  terrainAMSL: number,
  cruiseAltM: number,
  overlapVolumes?: OverlapVolume[],
  emcon = false,
  scoringOptions?: PathScoringOptions,
): GraphPoint[] {
  const hardThreats = routingHardThreats(
    objective,
    placedCuas,
    placedRadars,
    placedEffectors,
    asset,
  )

  const nodes = buildGraphNodes(start, goal, hardThreats)
  if (nodes.length < 2) return [start, goal]

  const startIdx = 0
  const goalIdx = 1
  const open: AStarNode[] = [{ idx: startIdx, g: 0, f: haversineM(start.lat, start.lon, goal.lat, goal.lon) / 1000, parent: null }]
  const gScore = new Map<number, number>([[startIdx, 0]])
  const cameFrom = new Map<number, number>()
  const closed = new Set<number>()

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!
    if (closed.has(current.idx)) continue
    closed.add(current.idx)

    if (current.idx === goalIdx) {
      return reconstructPath(cameFrom, goalIdx, nodes)
    }

    for (let j = 0; j < nodes.length; j++) {
      if (j === current.idx || closed.has(j)) continue
      const a = nodes[current.idx]
      const b = nodes[j]
      if (!edgeTraversable(a, b, hardThreats, objective)) continue

      const { cost } = edgeCostKm(
        a,
        b,
        terrainAMSL,
        asset,
        placedCuas,
        placedRadars,
        placedEffectors,
        overlapVolumes,
        objective,
        emcon,
        cruiseAltM,
        scoringOptions,
      )
      const tentativeG = (gScore.get(current.idx) ?? Infinity) + cost
      if (tentativeG >= (gScore.get(j) ?? Infinity)) continue

      gScore.set(j, tentativeG)
      cameFrom.set(j, current.idx)
      const h = haversineM(b.lat, b.lon, goal.lat, goal.lon) / 1000
      open.push({ idx: j, g: tentativeG, f: tentativeG + h, parent: current.idx })
    }
  }

  return detourRouteAroundThreats(start, goal, hardThreats)
}

export function trimRouteToRange(
  points: GraphPoint[],
  maxRange_km: number,
): GraphPoint[] {
  if (points.length < 2) return points
  const trimmed = [points[0]]
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const seg = haversineM(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
    if (acc + seg <= maxRange_km * 1000) {
      trimmed.push(points[i])
      acc += seg
    } else {
      trimmed.push(
        destinationPointM(
          points[i - 1].lat,
          points[i - 1].lon,
          maxRange_km * 1000 - acc,
          bearingDeg(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon),
        ),
      )
      break
    }
  }
  return trimmed
}
