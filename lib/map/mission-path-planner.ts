import { destinationPointM, haversineM } from '@/lib/propagation/geo'
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain'
import type { MapUasAsset, MissionPlan, MissionWaypoint, OverlapVolume, PlacedCuas, PlacedEffector, PlacedRadar } from '@/lib/map/types'

export const DEFAULT_AGL_M = 25
export const PK_THRESHOLD_PCT = 20
const DETOUR_BUFFER_M = 150
export interface MissionPathPlannerInput {
  startLon: number; startLat: number; startTerrainAMSL: number
  goalLon: number; goalLat: number; goalTerrainAMSL: number
  goalKind: 'target' | 'aoi'; asset: MapUasAsset
  placedCuas: PlacedCuas[]; placedRadars: PlacedRadar[]; placedEffectors: PlacedEffector[]
  emcon: boolean; overlapVolumes?: OverlapVolume[]
}

export interface PathSegmentScore {
  lon1: number; lat1: number; lon2: number; lat2: number; alt_m: number
  distance_km: number; maxPk_pct: number; inDefeatRange: boolean
}

interface ThreatCircle {
  id: string; kind: 'cuas' | 'radar' | 'effector'
  lon: number; lat: number; radius_m: number; alt_m: number; cuasInstanceId?: string
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dL = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(dL) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dL)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function lateralOffset(lat: number, lon: number, bearing: number, offsetM: number, side: 1 | -1) {
  return destinationPointM(lat, lon, offsetM, (bearing + 90 * side + 360) % 360)
}

function distPointToSegmentM(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const segLen = haversineM(y1, x1, y2, x2)
  if (segLen < 1) return haversineM(py, px, y1, x1)
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2 + 1e-12)))
  return haversineM(py, px, y1 + t * (y2 - y1), x1 + t * (x2 - x1))
}

function segmentIntersectsThreat(lon1: number, lat1: number, lon2: number, lat2: number, threat: ThreatCircle): boolean {
  return distPointToSegmentM(threat.lon, threat.lat, lon1, lat1, lon2, lat2) < threat.radius_m
}

function supportsLowFlight(asset: MapUasAsset): boolean {
  return asset.max_altitude_agl_m <= 500 || asset.category === 'FPV' || asset.category === 'tactical'
}

function ceilingAMSL(terrainAMSL: number, asset: MapUasAsset): number {
  return asset.altitude_reference === 'AMSL' ? asset.max_altitude_agl_m : terrainAMSL + asset.max_altitude_agl_m
}

function collectThreats(placedCuas: PlacedCuas[], placedRadars: PlacedRadar[], placedEffectors: PlacedEffector[]): ThreatCircle[] {
  const out: ThreatCircle[] = []
  for (const c of placedCuas) {
    out.push({ id: c.instanceId, kind: 'cuas', lon: c.lon, lat: c.lat, radius_m: c.asset.defeat_range_m, alt_m: c.terrainAMSL + TERRAIN_SURFACE_AGL_M, cuasInstanceId: c.instanceId })
  }
  for (const r of placedRadars) {
    out.push({ id: r.instanceId, kind: 'radar', lon: r.lon, lat: r.lat, radius_m: r.asset.dome_range_km * 1000, alt_m: r.terrainAMSL + TERRAIN_SURFACE_AGL_M })
  }
  for (const e of placedEffectors) {
    out.push({ id: e.instanceId, kind: 'effector', lon: e.lon, lat: e.lat, radius_m: e.asset.engagement_dome_km * 1000, alt_m: e.terrainAMSL + TERRAIN_SURFACE_AGL_M })
  }
  return out
}

function pkForCuas(cuasInstanceId: string | undefined, overlapVolumes?: OverlapVolume[]): number {
  if (!cuasInstanceId) return 50
  return overlapVolumes?.find((o) => o.cuasInstanceId === cuasInstanceId)?.effectiveness_pct ?? 50
}

export function scorePathSegment(
  lon1: number, lat1: number, lon2: number, lat2: number, alt_m: number,
  placedCuas: PlacedCuas[], overlapVolumes?: OverlapVolume[],
): PathSegmentScore {
  const distance_km = haversineM(lat1, lon1, lat2, lon2) / 1000
  let maxPk_pct = 0
  let inDefeatRange = false
  const midLon = (lon1 + lon2) / 2
  const midLat = (lat1 + lat2) / 2
  for (const cuas of placedCuas) {
    const horiz_m = haversineM(cuas.lat, cuas.lon, midLat, midLon)
    const cuasAlt = cuas.terrainAMSL + TERRAIN_SURFACE_AGL_M
    if (Math.hypot(horiz_m, Math.abs(alt_m - cuasAlt)) <= cuas.asset.defeat_range_m) {
      inDefeatRange = true
      maxPk_pct = Math.max(maxPk_pct, pkForCuas(cuas.instanceId, overlapVolumes))
    }
  }
  return { lon1, lat1, lon2, lat2, alt_m, distance_km, maxPk_pct, inDefeatRange }
}

function assignAltitude(lon: number, lat: number, terrainAMSL: number, asset: MapUasAsset, threats: ThreatCircle[], isTerminal: boolean): number {
  let alt = terrainAMSL + DEFAULT_AGL_M
  const ceil = ceilingAMSL(terrainAMSL, asset)
  for (const t of threats) {
    const horiz = haversineM(t.lat, t.lon, lat, lon)
    if (horiz > t.radius_m) continue
    if (t.kind === 'cuas' && Math.hypot(horiz, Math.abs(alt - t.alt_m)) <= t.radius_m && alt < ceil) {
      alt = Math.min(ceil, t.alt_m + t.radius_m * 0.35 + 30)
    } else if (t.kind === 'radar') {
      alt = Math.min(alt, terrainAMSL + DEFAULT_AGL_M)
    }
  }
  if (isTerminal) alt = Math.max(alt, terrainAMSL + Math.min(asset.max_altitude_agl_m * 0.4, 120))
  return Math.min(alt, ceil)
}

function transitSpeedKmh(asset: MapUasAsset, napOfEarth: boolean): number {
  const base = Math.max(asset.max_speed_kmh, 1)
  return napOfEarth ? base * 0.7 : base
}

function buildRoutePoints(
  startLon: number, startLat: number, goalLon: number, goalLat: number,
  threats: ThreatCircle[], maxRange_km: number,
): { lon: number; lat: number }[] {
  let points = [{ lon: startLon, lat: startLat }, { lon: goalLon, lat: goalLat }]
  for (const threat of threats) {
    const next = [points[0]]
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]
      const b = points[i + 1]
      if (!segmentIntersectsThreat(a.lon, a.lat, b.lon, b.lat, threat)) {
        next.push(b)
        continue
      }
      const brg = bearingDeg(a.lat, a.lon, b.lat, b.lon)
      const midLat = (a.lat + b.lat) / 2
      const midLon = (a.lon + b.lon) / 2
      const detour = lateralOffset(midLat, midLon, brg, threat.radius_m + DETOUR_BUFFER_M, 1)
      next.push(detour, b)
    }
    points = next
    if (points.length > 48) break
  }
  const total_m = points.reduce((sum, p, i) => (i === 0 ? 0 : sum + haversineM(points[i - 1].lat, points[i - 1].lon, p.lat, p.lon)), 0)
  if (total_m / 1000 > maxRange_km) {
    const trimmed = [points[0]]
    let acc = 0
    for (let i = 1; i < points.length; i++) {
      const seg = haversineM(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
      if (acc + seg <= maxRange_km * 1000) { trimmed.push(points[i]); acc += seg }
      else {
        trimmed.push(destinationPointM(points[i - 1].lat, points[i - 1].lon, maxRange_km * 1000 - acc, bearingDeg(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)))
        break
      }
    }
    points = trimmed
  }
  return points
}

function waypointIdForIndex(idx: number, lon: number, lat: number): string {
  return `wp-${idx}-${lon.toFixed(5)}-${lat.toFixed(5)}`
}

export function planMissionPath(input: MissionPathPlannerInput): MissionPlan {
  const threats = collectThreats(input.placedCuas, input.placedRadars, input.placedEffectors)
  const speed = transitSpeedKmh(input.asset, supportsLowFlight(input.asset))
  const routePoints = buildRoutePoints(input.startLon, input.startLat, input.goalLon, input.goalLat, threats, input.asset.max_range_km)
  const waypoints = routePoints.map((pt, idx) => {
    const isStart = idx === 0
    const isGoal = idx === routePoints.length - 1
    const terrain = isStart ? input.startTerrainAMSL : isGoal ? input.goalTerrainAMSL : input.startTerrainAMSL
    const kind = isStart ? 'start' : isGoal ? (input.goalKind === 'target' ? 'goal' : 'terminal') : 'detour'
    return {
      id: waypointIdForIndex(idx, pt.lon, pt.lat), lon: pt.lon, lat: pt.lat, terrainAMSL: terrain,
      alt_m: assignAltitude(pt.lon, pt.lat, terrain, input.asset, threats, isGoal),
      speed_kmh: isGoal ? speed * 0.85 : speed, kind,
    } as MissionWaypoint
  })
  let totalDistance_km = 0
  let maxPk_pct = 0
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const cur = waypoints[i]
    const score = scorePathSegment(prev.lon, prev.lat, cur.lon, cur.lat, (prev.alt_m + cur.alt_m) / 2, input.placedCuas, input.overlapVolumes)
    totalDistance_km += score.distance_km
    maxPk_pct = Math.max(maxPk_pct, score.maxPk_pct)
  }
  const stillBlocked = threats.some((t) => segmentIntersectsThreat(input.startLon, input.startLat, input.goalLon, input.goalLat, t))
  return {
    goalKind: input.goalKind, goalLon: input.goalLon, goalLat: input.goalLat, goalTerrainAMSL: input.goalTerrainAMSL,
    waypoints, emcon: input.emcon, manualOverride: false,
    totalDistance_km: Math.min(totalDistance_km, input.asset.max_range_km), maxPk_pct,
    pkThresholdExceeded: maxPk_pct >= PK_THRESHOLD_PCT,
    pathMode: stillBlocked && maxPk_pct >= PK_THRESHOLD_PCT ? 'soft-minimize' : 'hard-avoid',
    updatedAt: new Date().toISOString(),
  }
}

export function missionWaypointEntityId(uasInstanceId: string, waypointId: string): string {
  return `map-mission-wp-${uasInstanceId}-${waypointId}`
}

export function parseMissionWaypointEntityId(entityId: string): { uasInstanceId: string; waypointId: string } | null {
  const prefix = 'map-mission-wp-'
  if (!entityId.startsWith(prefix)) return null
  const rest = entityId.slice(prefix.length)
  const sep = rest.indexOf('-wp-')
  if (sep > 0) return { uasInstanceId: rest.slice(0, sep), waypointId: rest.slice(sep + 1) }
  const dash = rest.indexOf('-')
  if (dash <= 0) return null
  return { uasInstanceId: rest.slice(0, dash), waypointId: rest.slice(dash + 1) }
}
