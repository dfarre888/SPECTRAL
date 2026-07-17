import { haversineM } from '@/lib/propagation/geo'
import { PD_THRESHOLD_PCT, PK_THRESHOLD_PCT } from '@/lib/map/mission-path-planner'
import { collectPkThreats } from '@/lib/map/mission-path-scoring'
import { segmentIntersectsAny } from '@/lib/map/mission-path-graph'
import type {
  MapUasAsset,
  MissionPlan,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
} from '@/lib/map/types'

export interface MissionFlightDetails {
  cruiseAlt_m: number
  cruiseAgl_m: number
  avgSpeed_kmh: number
  timeToTarget_min: number
  distance_km: number
  waypointCount: number
  routeObjective: 'pk' | 'pd' | 'combined'
  maxPk_pct: number
  maxPd_pct: number
  pkExposure_km: number
  pdExposure_km: number
  pkThresholdExceeded: boolean
  pdThresholdExceeded: boolean
  pathMode: MissionPlan['pathMode']
  emcon: boolean
  manualOverride: boolean
  directThroughPkThreat: boolean
  routeAssessment: string
  routeOptimal: boolean
}

function segmentTimeMin(lat1: number, lon1: number, lat2: number, lon2: number, speed_kmh: number): number {
  const dist_km = haversineM(lat1, lon1, lat2, lon2) / 1000
  return (dist_km / Math.max(speed_kmh, 1)) * 60
}

export function computeMissionFlightDetails(
  uas: PlacedUas,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
): MissionFlightDetails | null {
  const mission = uas.mission
  if (!mission || mission.waypoints.length < 2) return null

  const wps = mission.waypoints
  const start = wps[0]
  const goal = wps[wps.length - 1]

  let timeToTarget_min = 0
  for (let i = 1; i < wps.length; i++) {
    const prev = wps[i - 1]
    const cur = wps[i]
    timeToTarget_min += segmentTimeMin(prev.lat, prev.lon, cur.lat, cur.lon, (prev.speed_kmh + cur.speed_kmh) / 2)
  }

  const transitWps = wps.filter((w) => w.kind !== 'goal' && w.kind !== 'terminal')
  const cruiseWp = transitWps[transitWps.length - 1] ?? start
  const cruiseAlt_m = cruiseWp.alt_m
  const cruiseAgl_m = cruiseAlt_m - cruiseWp.terrainAMSL

  const speeds = wps.slice(0, -1).map((w) => w.speed_kmh)
  const avgSpeed_kmh = speeds.reduce((a, b) => a + b, 0) / Math.max(speeds.length, 1)

  const pkThreats = collectPkThreats(placedCuas, placedEffectors)
  const directThroughPkThreat = segmentIntersectsAny(start.lon, start.lat, goal.lon, goal.lat, pkThreats)
  const routeAssessment = buildRouteAssessment(mission, directThroughPkThreat, placedCuas, placedEffectors)

  const routeOptimal =
    !directThroughPkThreat &&
    !mission.pkThresholdExceeded &&
    !mission.pdThresholdExceeded &&
    mission.pathMode !== 'soft-minimize'

  return {
    cruiseAlt_m: Math.round(cruiseAlt_m),
    cruiseAgl_m: Math.round(cruiseAgl_m),
    avgSpeed_kmh: Math.round(avgSpeed_kmh),
    timeToTarget_min: Math.round(timeToTarget_min),
    distance_km: mission.totalDistance_km,
    waypointCount: mission.waypoints.length,
    routeObjective: mission.routeObjective ?? 'pk',
    maxPk_pct: mission.maxPk_pct,
    maxPd_pct: mission.maxPd_pct,
    pkExposure_km: mission.pkExposure_km,
    pdExposure_km: mission.pdExposure_km,
    pkThresholdExceeded: mission.pkThresholdExceeded,
    pdThresholdExceeded: mission.pdThresholdExceeded,
    pathMode: mission.pathMode,
    emcon: mission.emcon,
    manualOverride: mission.manualOverride,
    directThroughPkThreat,
    routeAssessment,
    routeOptimal,
  }
}

function buildRouteAssessment(
  mission: MissionPlan,
  directThroughPkThreat: boolean,
  placedCuas: PlacedCuas[],
  placedEffectors: PlacedEffector[],
): string {
  if (mission.manualOverride) {
    return 'Manual flight path — auto-replan paused. Click Replan to optimise around new threats.'
  }
  if (placedCuas.length === 0 && placedEffectors.length === 0) {
    return 'No C-UAS or effector on map — route ignores defeat envelopes until you place counter-systems.'
  }
  if (directThroughPkThreat && mission.waypoints.length <= 2) {
    return 'Direct chord crosses a defeat envelope with no detour — click Replan or Edit flight path.'
  }
  if (directThroughPkThreat && mission.maxPk_pct >= PK_THRESHOLD_PCT) {
    return `Suboptimal — max Pk ${mission.maxPk_pct}% on path through threat airspace. Replan for a flank.`
  }
  if (mission.pathMode === 'soft-minimize') {
    return 'Soft-minimise — exposure reduced but full avoidance not possible within range.'
  }
  if (mission.waypoints.length > 2) {
    return `Detour route with ${mission.waypoints.length - 2} extra waypoint(s) around threat domes.`
  }
  if (mission.routeObjective === 'pd' && mission.pdThresholdExceeded) {
    return `Pd exposure flagged (${mission.maxPd_pct}% ≥ ${PD_THRESHOLD_PCT}%).`
  }
  return 'Current chord avoids mapped defeat envelopes on Pk-optimised routing.'
}
