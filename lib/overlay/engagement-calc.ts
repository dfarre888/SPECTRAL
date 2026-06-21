// SPECTRAL — 1v1 SAM Engagement Calculator
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import {
  computeSamIntercept,
  getSamProfile,
  SAM_PROFILES,
  type EcmLevel,
  type SamInterceptResult,
  type UasTargetCategory,
} from '@/lib/risk/sam-intercept'
import { resolveSamProfileId } from '@/lib/defeat/sam-matrix-bridge'

export interface EngagementScenario {
  system_id: string
  platform_id: string
  target_cat: UasTargetCategory
  uas_lon: number
  uas_lat: number
  uas_alt_m: number
  sam_lon: number
  sam_lat: number
  sam_alt_m: number
  ecm_level: EcmLevel
  salvo_count: number
}

export interface EngagementResult {
  scenario: EngagementScenario
  slant_range_m: number
  intercept: SamInterceptResult | null
  bearing_deg: number
  time_of_flight_s: number
  detect_range_m: number
  track_range_m: number
  launch_range_m: number
  lethal_range_m: number
  phase:
    | 'outside_detect'
    | 'detect'
    | 'track'
    | 'launch'
    | 'intercept'
    | 'post_intercept'
}

export function haversineM(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const R = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function computeEngagement(s: EngagementScenario): EngagementResult {
  const profileId = resolveSamProfileId(s.system_id) ?? s.system_id
  const profile = getSamProfile(profileId)
  const groundRange = haversineM(s.sam_lon, s.sam_lat, s.uas_lon, s.uas_lat)
  const altDiff = s.uas_alt_m - s.sam_alt_m
  const slant_range_m = Math.sqrt(groundRange ** 2 + altDiff ** 2)

  const bearing_deg =
    (Math.atan2(s.uas_lon - s.sam_lon, s.uas_lat - s.sam_lat) * 180) / Math.PI

  const intercept = computeSamIntercept(
    {
      system_id: profileId,
      target_category: s.target_cat,
      slant_range_m,
      target_alt_m: s.uas_alt_m,
      ecm_level: s.ecm_level,
      salvo_count: s.salvo_count,
    },
    SAM_PROFILES,
  )

  const maxRange = profile?.max_range_m ?? 15_000
  const detect_range_m = maxRange * 1.4
  const track_range_m = maxRange * 1.1
  const launch_range_m = maxRange * 0.85
  const lethal_range_m = maxRange

  const time_of_flight_s = slant_range_m / 800

  let phase: EngagementResult['phase'] = 'outside_detect'
  if (slant_range_m > maxRange * 1.1) {
    phase = 'outside_detect'
  } else if (slant_range_m <= lethal_range_m * 0.5) {
    phase = 'intercept'
  } else if (slant_range_m <= launch_range_m) {
    phase = 'launch'
  } else if (slant_range_m <= track_range_m) {
    phase = 'track'
  } else if (slant_range_m <= detect_range_m) {
    phase = 'detect'
  }

  return {
    scenario: s,
    slant_range_m,
    intercept,
    bearing_deg,
    time_of_flight_s,
    detect_range_m,
    track_range_m,
    launch_range_m,
    lethal_range_m,
    phase,
  }
}
