import type { PlatformCategory } from '@/lib/types'

/** OSINT altitude reference for combat envelope disc placement. */
export type AltitudeReference = 'AGL' | 'AMSL'

export interface MapUasAsset {
  id: string
  name: string
  slug: string
  category: PlatformCategory
  categoryLabel: string
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

export interface MapAssetsPayload {
  uas: MapUasAsset[]
  cuas: MapCuasAsset[]
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
  loiter?: LoiterPlan
  infoPanelClosed: boolean
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
  | { active: true; kind: 'loiter'; uasInstanceId: string; asset: MapUasAsset }

export interface CursorPosition {
  lon: number
  lat: number
  terrainAMSL: number | null
}
