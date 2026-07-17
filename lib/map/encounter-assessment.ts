import { haversineM } from '@/lib/propagation/geo'
import { PD_THRESHOLD_PCT, PK_THRESHOLD_PCT } from '@/lib/map/mission-path-planner'
import { collectPdThreats, collectPkThreats, type PathSegmentScore } from '@/lib/map/mission-path-scoring'
import { segmentIntersectsAny } from '@/lib/map/mission-path-graph'
import {
  buildEncounterCollateral,
  type EncounterCollateralAssessment,
} from '@/lib/map/encounter-collateral'
import type { BlastRadii, BuildingProtection, PopulationDensityTier, TimeOfDay } from '@/lib/risk/types'
import type {
  MissionPlan,
  OverlapVolume,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
} from '@/lib/map/types'

export interface EncounterThreatOnRoute {
  instanceId: string
  name: string
  kind: 'cuas' | 'effector' | 'radar'
  peakPk_pct: number
  peakPd_pct: number
  exposureKm: number
}

export interface EncounterAssessment {
  summary: string
  encounterSummary: string
  threatsOnRoute: EncounterThreatOnRoute[]
  detectionExposure: string
  killExposure: string
  rerouteAssessment: string
  tacticalRecommendations: string[]
  peakPkSegmentIndex: number | null
  peakPdSegmentIndex: number | null
  routeObjective: MissionPlan['routeObjective']
  collateral: EncounterCollateralAssessment | null
}

function upsertThreat(
  map: Map<string, EncounterThreatOnRoute>,
  instanceId: string,
  kind: 'cuas' | 'effector' | 'radar',
  name: string,
  pk: number,
  pd: number,
  distKm: number,
) {
  const key = `${kind}:${instanceId}`
  const existing = map.get(key)
  if (!existing) {
    map.set(key, { instanceId, name, kind, peakPk_pct: pk, peakPd_pct: pd, exposureKm: distKm })
    return
  }
  existing.peakPk_pct = Math.max(existing.peakPk_pct, pk)
  existing.peakPd_pct = Math.max(existing.peakPd_pct, pd)
  existing.exposureKm += distKm
}

function scoreThreatsOnRoute(
  mission: MissionPlan,
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  overlaps: OverlapVolume[],
): EncounterThreatOnRoute[] {
  const scores = mission.segmentScores ?? []
  if (scores.length === 0) return []

  const byThreat = new Map<string, EncounterThreatOnRoute>()

  for (let si = 0; si < scores.length; si++) {
    const seg = scores[si]
    const prev = mission.waypoints[si]
    const cur = mission.waypoints[si + 1]
    const samples = 3
    for (let s = 0; s < samples; s++) {
      const t = s / (samples - 1)
      const lon = prev.lon + t * (cur.lon - prev.lon)
      const lat = prev.lat + t * (cur.lat - prev.lat)
      const alt = prev.alt_m + t * (cur.alt_m - prev.alt_m)

      for (const cuas of placedCuas) {
        const horiz = haversineM(cuas.lat, cuas.lon, lat, lon)
        if (horiz > cuas.asset.defeat_range_m) continue
        const pk = overlaps.find((o) => o.cuasInstanceId === cuas.instanceId)?.effectiveness_pct ?? 50
        upsertThreat(byThreat, cuas.instanceId, 'cuas', cuas.asset.name, pk, seg.maxPd_pct, seg.distance_km / samples)
      }

      for (const eff of placedEffectors) {
        const horiz = haversineM(eff.lat, eff.lon, lat, lon)
        const radius_m = eff.asset.engagement_dome_km * 1000
        if (horiz > radius_m) continue
        if (alt > eff.terrainAMSL + eff.asset.alt_max_km * 1000) continue
        const pk = eff.asset.pk_estimate_pct ?? 75
        upsertThreat(byThreat, eff.instanceId, 'effector', eff.asset.name, pk, seg.maxPd_pct, seg.distance_km / samples)
      }

      for (const radar of placedRadars) {
        const horiz = haversineM(radar.lat, radar.lon, lat, lon)
        const radius_m = radar.asset.detection_range_km * 1000
        if (horiz > radius_m) continue
        upsertThreat(byThreat, radar.instanceId, 'radar', radar.asset.name, seg.maxPk_pct, seg.maxPd_pct, seg.distance_km / samples)
      }
    }
  }

  return [...byThreat.values()].sort((a, b) => b.peakPk_pct + b.peakPd_pct - (a.peakPk_pct + a.peakPd_pct))
}

function peakSegmentIndex(scores: PathSegmentScore[], field: 'maxPk_pct' | 'maxPd_pct'): number | null {
  if (scores.length === 0) return null
  let best = 0
  let idx = 0
  for (let i = 0; i < scores.length; i++) {
    if (scores[i][field] > best) {
      best = scores[i][field]
      idx = i
    }
  }
  return best > 0 ? idx : null
}

export function buildEncounterAssessment(input: {
  uas: PlacedUas
  mission: MissionPlan
  placedCuas: PlacedCuas[]
  placedRadars: PlacedRadar[]
  placedEffectors: PlacedEffector[]
  overlaps: OverlapVolume[]
  population_tier?: PopulationDensityTier
  time_of_day?: TimeOfDay
  building_protection?: BuildingProtection
  warheadOverride?: BlastRadii | null
}): EncounterAssessment {
  const {
    uas,
    mission,
    placedCuas,
    placedRadars,
    placedEffectors,
    overlaps,
    population_tier = 'urban',
    time_of_day = 'business_day',
    building_protection = 'light',
    warheadOverride = null,
  } = input
  const scores = mission.segmentScores ?? []
  const routeObjective = mission.routeObjective ?? 'combined'
  const threatsOnRoute = scoreThreatsOnRoute(mission, placedCuas, placedRadars, placedEffectors, overlaps)
  const peakPkIdx = peakSegmentIndex(scores, 'maxPk_pct')
  const peakPdIdx = peakSegmentIndex(scores, 'maxPd_pct')

  const pkThreats = collectPkThreats(placedCuas, placedEffectors)
  const pdThreats = collectPdThreats(placedRadars, uas.asset)
  const start = mission.waypoints[0]
  const goal = mission.waypoints[mission.waypoints.length - 1]
  const directChordPk = segmentIntersectsAny(start.lon, start.lat, goal.lon, goal.lat, pkThreats)

  let pathIntersectsPk = false
  let pathIntersectsPd = false
  for (let i = 1; i < mission.waypoints.length; i++) {
    const a = mission.waypoints[i - 1]
    const b = mission.waypoints[i]
    if (segmentIntersectsAny(a.lon, a.lat, b.lon, b.lat, pkThreats)) pathIntersectsPk = true
    if (segmentIntersectsAny(a.lon, a.lat, b.lon, b.lat, pdThreats)) pathIntersectsPd = true
  }

  const detParts: string[] = []
  if (mission.maxPd_pct === 0 && placedRadars.length === 0) {
    detParts.push('No radar cueing threat assessed on this route.')
  } else if (mission.pdThresholdExceeded) {
    detParts.push(
      `Detection exposure flagged — peak segment Pd ${mission.maxPd_pct}% (threshold ${PD_THRESHOLD_PCT}%). Integrated exposure ${mission.pdExposure_km.toFixed(1)} km.`,
    )
  } else if (mission.maxPd_pct > 0) {
    detParts.push(
      `Peak Pd ${mission.maxPd_pct}% within acceptable band. Integrated detection exposure ${mission.pdExposure_km.toFixed(1)} km along ${mission.totalDistance_km.toFixed(1)} km path.`,
    )
  } else {
    detParts.push('Route remains outside assessed radar detection envelopes.')
  }
  if (mission.emcon) detParts.push('EMCON active — radiated signature suppressed for Pd scoring.')

  const killParts: string[] = []
  if (placedCuas.length === 0 && placedEffectors.length === 0) {
    killParts.push('No C-UAS or SAM/BMD effector placed — Pk exposure not modelled.')
  } else if (mission.pkThresholdExceeded) {
    killParts.push(
      `Kill-chain exposure flagged — peak segment Pk ${mission.maxPk_pct}% (threshold ${PK_THRESHOLD_PCT}%). Integrated exposure ${mission.pkExposure_km.toFixed(1)} km.`,
    )
  } else if (mission.maxPk_pct > 0) {
    killParts.push(
      `Peak assessed Pk ${mission.maxPk_pct}% along route. Integrated kill exposure ${mission.pkExposure_km.toFixed(1)} km.`,
    )
  } else {
    killParts.push('Route clears mapped defeat / engagement domes on current geometry.')
  }

  let rerouteAssessment: string
  if (mission.manualOverride) {
    rerouteAssessment =
      'Manual flight-path edit active — auto-replan suspended unless a new threat intersects the current polyline.'
  } else if (mission.pathMode === 'hard-avoid' && !pathIntersectsPk && !pathIntersectsPd) {
    rerouteAssessment = `Hard-avoid routing — ${mission.waypoints.length - 2} detour waypoint(s) keep the full polyline outside threat envelopes where range allows.`
  } else if (mission.pathMode === 'soft-minimize') {
    rerouteAssessment =
      'Soft-minimise — planner reduced combined Pk+Pd exposure but full avoidance is not achievable within UAS range/endurance.'
  } else if (directChordPk && mission.waypoints.length <= 2) {
    rerouteAssessment = 'Direct chord crosses a defeat envelope — replan or add manual detour waypoints.'
  } else {
    rerouteAssessment = `Combined Pk+Pd objective — ${mission.totalDistance_km.toFixed(1)} km path scored across ${scores.length} segment(s).`
  }

  const recommendations: string[] = []
  if (mission.pkThresholdExceeded) {
    recommendations.push('Flank wide of engagement domes or climb above effector ceiling where platform allows.')
    if (uas.asset.category === 'loitering_munition' || uas.asset.max_altitude_agl_m <= 500) {
      recommendations.push('Consider nap-of-earth transit in radar shadow — low altitude reduces Pd on most acquisition radars.')
    }
  }
  if (mission.pdThresholdExceeded && !mission.emcon) {
    recommendations.push('Enable EMCON for ingress if mission allows — reduces radiated cross-section for Pd scoring.')
  }
  if (threatsOnRoute.some((t) => t.kind === 'effector' && t.peakPk_pct >= PK_THRESHOLD_PCT)) {
    recommendations.push('Assessed DEW/SAM effector on axis — weather and dwell-time limitations may degrade kill probability (OSINT training estimate).')
  }
  if (recommendations.length === 0 && threatsOnRoute.length === 0) {
    recommendations.push('No counter-system intersection on current path — maintain EMCON discipline if penetrating contested airspace.')
  }

  const summary = `${uas.asset.name} · ${mission.totalDistance_km.toFixed(1)} km · max Pk ${mission.maxPk_pct}% · max Pd ${mission.maxPd_pct}%`
  const encounterSummary = [
    `Mission ${mission.goalKind.toUpperCase()} for ${uas.asset.name}.`,
    pathIntersectsPk || pathIntersectsPd
      ? `Flight polyline transits ${threatsOnRoute.length} counter-system envelope(s).`
      : 'Flight polyline clears all placed counter-system envelopes on current geometry.',
    mission.pkThresholdExceeded || mission.pdThresholdExceeded
      ? 'Exposure thresholds exceeded — review reroute options.'
      : 'Exposure within assessed training thresholds.',
  ].join(' ')

  const collateral = buildEncounterCollateral({
    uas,
    mission,
    population_tier,
    time_of_day,
    building_protection,
    warheadOverride,
  })

  return {
    summary,
    encounterSummary,
    threatsOnRoute,
    detectionExposure: detParts.join(' '),
    killExposure: killParts.join(' '),
    rerouteAssessment,
    tacticalRecommendations: recommendations,
    peakPkSegmentIndex: peakPkIdx,
    peakPdSegmentIndex: peakPdIdx,
    routeObjective,
    collateral,
  }
}
