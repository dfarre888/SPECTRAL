import type { PathSegmentScore } from '@/lib/map/mission-path-scoring'
import type { PlatformCategory, PlatformSide } from '@/lib/types'
import type { EffectorTier, EffectType } from '@/lib/spectrum/effector-types'
import type { RadarRole } from '@/lib/spectrum/radar-types'
import type { Side } from '@/lib/spectrum/types'

/** OSINT altitude reference for combat envelope disc placement. */
export type AltitudeReference = 'AGL' | 'AMSL'

export interface MapUasAsset {
  id: string
  name: string
  slug: string
  category: PlatformCategory
  categoryLabel: string
  /** Red threat, blue friendly, or both (neutral). Omitted in tests defaults via uasForceSides. */
  side?: PlatformSide | null
  manufacturer?: string | null
  /** True when max_range_km is the COTS 5 km training default, not a published spec. */
  rangeEstimated?: boolean
  image_url: string | null
  max_altitude_agl_m: number
  /** Whether max_altitude_agl_m is AGL (above launch terrain) or absolute AMSL. */
  altitude_reference: AltitudeReference
  max_range_km: number
  max_speed_kmh: number
  endurance_min: number
  climb_rate_mpm: number
}

export interface MapCuasAsset {
  id: string
  name: string
  categoryLabel: string
  image_url: string | null
  defeat_range_m: number
  defeat_range_km: number
  defeat_methods: string[]
}

export interface MapRadarAsset {
  id: string
  name: string
  side: Side
  role: RadarRole
  roleLabel: string
  image_url: string | null
  /** OSINT instrumented / class range — shown in sidebar. */
  detection_range_km: number
  /** Tactical dome radius on globe (may be capped — see spectra-assets). */
  dome_range_km: number
  sector_deg: number
  bandsLabel: string
  nato_name?: string | null
  associated_system?: string | null
}

export interface MapEffectorAsset {
  id: string
  name: string
  side: Side
  tier: EffectorTier
  tierLabel: string
  effect: EffectType
  engagement_max_km: number
  engagement_min_km: number
  /** Tactical globe dome radius (capped — sidebar shows engagement_max_km). */
  engagement_dome_km: number
  /** Assessed Pk (%), from effector seed pk_estimate. */
  pk_estimate_pct: number
  alt_min_km: number
  alt_max_km: number
  cueing_radar_ids: string[]
  /** Linked cueing radars resolved from the radar catalogue. */
  linkedRadars: MapRadarAsset[]
  image_url: string | null
  associated_system?: string | null
}

export interface MapAssetsPayload {
  uas: MapUasAsset[]
  cuas: MapCuasAsset[]
  radars: MapRadarAsset[]
  effectors: MapEffectorAsset[]
}

export interface PlacedUas {
  instanceId: string
  asset: MapUasAsset
  lon: number
  lat: number
  terrainAMSL: number
  /** MSL altitude of the horizontal combat envelope disc. */
  discAltitude_m: number
  lateralRadius_m: number
  ceilingAMSL_m: number
  annotationTime_min: number
  effectiveRange_km: number
  /** Terrain AMSL samples around disc perimeter — drives terrain-following side walls. */
  wallTerrain_m?: number[]
  loiter?: LoiterPlan
  mission?: MissionPlan
  infoPanelClosed: boolean
}


export interface MissionWaypoint {
  id: string
  lon: number
  lat: number
  terrainAMSL: number
  /** AMSL flight altitude at this waypoint. */
  alt_m: number
  speed_kmh: number
  kind: 'start' | 'transit' | 'detour' | 'terminal' | 'goal'
}

/** Minimise C-UAS Pk exposure vs radar detection (Pd) exposure vs both. */
export type MissionRouteObjective = 'pk' | 'pd' | 'combined'

export interface MissionPlan {
  goalKind: 'target' | 'aoi'
  goalLon: number
  goalLat: number
  goalTerrainAMSL: number
  waypoints: MissionWaypoint[]
  emcon: boolean
  /** pk = minimise defeat envelope exposure; pd = minimise radar detection exposure. */
  routeObjective: MissionRouteObjective
  manualOverride: boolean
  totalDistance_km: number
  maxPk_pct: number
  maxPd_pct: number
  /** Integrated Pd × distance along route (km). */
  pdExposure_km: number
  /** Integrated Pk × distance along route (km). */
  pkExposure_km: number
  /** True when max segment Pk ≥ 20% and hard avoid was not fully achievable. */
  pkThresholdExceeded: boolean
  /** True when max segment Pd ≥ 25%. */
  pdThresholdExceeded: boolean
  pathMode: 'hard-avoid' | 'soft-minimize' | 'optimized'
  /** Per-leg Pk/Pd scores for path heatmap rendering. */
  segmentScores?: PathSegmentScore[]
  updatedAt: string
}

export interface LoiterPlan {
  lon: number
  lat: number
  terrainAMSL: number
  transitTime_min: number
  returnTime_min: number
  timeOnStation_min: number
  exceedsEndurance: boolean
}

export interface PlacedCuas {
  instanceId: string
  asset: MapCuasAsset
  lon: number
  lat: number
  terrainAMSL: number
  hasTerrainMasking: boolean
  /** Terrain AMSL samples around defeat sphere equator — terrain-following side walls. */
  wallTerrain_m?: number[]
}

export interface PlacedRadar {
  instanceId: string
  asset: MapRadarAsset
  lon: number
  lat: number
  terrainAMSL: number
}

export interface PlacedEffector {
  instanceId: string
  asset: MapEffectorAsset
  lon: number
  lat: number
  terrainAMSL: number
}

export interface OverlapVolume {
  id: string
  uasInstanceId: string
  cuasInstanceId: string
  lon: number
  lat: number
  alt_m: number
  radius_m: number
  effectiveness_pct: number
  isDefeat: boolean
  label: string
}

export interface WindSample {
  windSpeed_kmh: number
  windDir_deg: number
  level: string
}

export type PlacementMode =
  | { active: false }
  | { active: true; kind: 'uas'; asset: MapUasAsset }
  | { active: true; kind: 'cuas'; asset: MapCuasAsset }
  | { active: true; kind: 'radar'; asset: MapRadarAsset }
  | { active: true; kind: 'effector'; asset: MapEffectorAsset }
  | { active: true; kind: 'loiter'; uasInstanceId: string; asset: MapUasAsset }
  | {
      active: true
      kind: 'mission-goal'
      uasInstanceId: string
      goalKind: 'target' | 'aoi'
      asset: MapUasAsset
    }

export interface CursorPosition {
  lon: number
  lat: number
  terrainAMSL: number | null
}
