import { BLUE_RADARS } from '@/data/seed-radars-blue'
import { RED_RADARS } from '@/data/seed-radars-red'
import { EXTRA_RADARS } from '@/data/seed-radars-extra'
import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue'
import { RED_EFFECTORS } from '@/data/seed-effectors-red'
import { resolvePlatformImagePath } from '@/lib/platforms/image-resolve'
import type { EffectorSystem, EffectorTier } from '@/lib/spectrum/effector-types'
import type { RadarRole, RadarSystem } from '@/lib/spectrum/radar-types'
import type { MapEffectorAsset, MapRadarAsset } from '@/lib/map/types'

/** Shared tactical cap for SAM/BMD engagement domes (Arrow-3 @ 2400 km breaks framing). */
export const MAX_MAP_EFFECTOR_DOME_KM = 500

/**
 * Tactical dome cap for radar detection hemispheres on the Cesium globe.
 * Instrumented ranges (e.g. AN/TPY-2 @ 2000 km) break framing; domes use the
 * capped tactical radius while sidebar labels retain full OSINT detection_range_km.
 */
export const MAX_MAP_RADAR_DOME_KM = 500

const ROLE_LABELS: Record<RadarRole, string> = {
  early_warning: 'Early warning',
  acquisition: 'Acquisition',
  engagement: 'Engagement / fire control',
  multifunction: 'Multifunction',
  counter_battery: 'Counter-battery',
  counter_uas: 'Counter-UAS',
  gci: 'GCI',
  naval_air_search: 'Naval air search',
  naval_multifunction: 'Naval multifunction',
  airborne_fire_control: 'Airborne fire control',
  height_finder: 'Height finder',
  gap_filler: 'Gap filler',
  pesa: 'PESA',
  aesa: 'AESA',
}

const TIER_LABELS: Record<EffectorTier, string> = {
  point_defence: 'Point defence',
  shorad: 'SHORAD',
  medium: 'Medium-range SAM',
  long: 'Long-range SAM',
  strategic_bmd: 'Strategic BMD',
  ciws_naval: 'Naval CIWS',
  c_uas: 'C-UAS',
}

export function radarDetectionRangeKm(r: RadarSystem): number {
  return (
    r.instrumented_range_km ??
    r.range_vs_fighter_km ??
    r.range_vs_small_uas_km ??
    0
  )
}

/** Globe dome radius — prefers fighter-class tactical range, capped for display. */
export function radarDomeRangeKm(r: RadarSystem): number {
  const tactical = r.range_vs_fighter_km ?? r.instrumented_range_km ?? 0
  return Math.min(tactical, MAX_MAP_RADAR_DOME_KM)
}

export function toMapRadarAsset(r: RadarSystem): MapRadarAsset {
  return {
    id: r.id,
    name: r.name,
    side: r.side,
    role: r.role,
    roleLabel: ROLE_LABELS[r.role] ?? r.role,
    image_url: resolvePlatformImagePath(r.id),
    detection_range_km: radarDetectionRangeKm(r),
    dome_range_km: radarDomeRangeKm(r),
    sector_deg: r.azimuth_deg ?? 360,
    bandsLabel: r.bands.join('/'),
    nato_name: r.nato_name,
    associated_system: r.associated_system,
  }
}

export function toMapEffectorAsset(
  e: EffectorSystem,
  radarById: Map<string, MapRadarAsset>,
): MapEffectorAsset {
  const linkedRadars = (e.cueing_radar_ids ?? [])
    .map((id) => radarById.get(id))
    .filter((r): r is MapRadarAsset => r !== undefined)

  return {
    id: e.id,
    name: e.name,
    side: e.side,
    tier: e.tier,
    tierLabel: TIER_LABELS[e.tier] ?? e.tier,
    effect: e.effect,
    engagement_max_km: e.envelope.max_range_km,
    engagement_min_km: e.envelope.min_range_km,
    engagement_dome_km: Math.min(e.envelope.max_range_km, MAX_MAP_EFFECTOR_DOME_KM),
    alt_min_km: e.envelope.min_alt_km,
    alt_max_km: e.envelope.max_alt_km,
    cueing_radar_ids: e.cueing_radar_ids ?? [],
    linkedRadars,
    image_url: resolvePlatformImagePath(e.id),
    associated_system: e.associated_system,
  }
}

export function getSpectraMapAssets(): { radars: MapRadarAsset[]; effectors: MapEffectorAsset[] } {
  const allRadars = [...BLUE_RADARS, ...RED_RADARS, ...EXTRA_RADARS]
  const radars = allRadars.map(toMapRadarAsset)
  const radarById = new Map(radars.map((r) => [r.id, r]))
  const effectors = [...BLUE_EFFECTORS, ...RED_EFFECTORS].map((e) =>
    toMapEffectorAsset(e, radarById),
  )
  return { radars, effectors }
}
