// SPECTRAL — SAM Defeat Matrix Bridge
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import {
  computeSamIntercept,
  getSamProfile,
  SAM_PROFILES,
  type UasTargetCategory,
} from '@/lib/risk/sam-intercept'

/** Nine reference platforms used in SAM defeat matrix migrations. */
export const SAM_MATRIX_PLATFORMS = [
  'fpv-rc',
  'shahed-136',
  'geran-2',
  'lancet-3',
  'kargu-2',
  'orlan-10',
  'tb2-bayraktar',
  'mq-9-reaper',
  'rq-4-global-hawk',
] as const

export type SamMatrixPlatformId = (typeof SAM_MATRIX_PLATFORMS)[number]

const PLATFORM_TO_CATEGORY: Record<string, UasTargetCategory> = {
  'fpv-rc': 'fpv',
  'shahed-136': 'owa',
  'geran-2': 'owa',
  'lancet-3': 'loitering_munition',
  'kargu-2': 'loitering_munition',
  'orlan-10': 'tactical_isr',
  'tb2-bayraktar': 'male',
  'mq-9-reaper': 'male',
  'rq-4-global-hawk': 'hale',
}

export const REFERENCE_ENGAGEMENT: Record<
  UasTargetCategory,
  { slant_range_m: number; target_alt_m: number }
> = {
  fpv: { slant_range_m: 500, target_alt_m: 100 },
  owa: { slant_range_m: 8_000, target_alt_m: 500 },
  loitering_munition: { slant_range_m: 5_000, target_alt_m: 300 },
  tactical_isr: { slant_range_m: 10_000, target_alt_m: 2_000 },
  male: { slant_range_m: 25_000, target_alt_m: 5_000 },
  hale: { slant_range_m: 80_000, target_alt_m: 15_000 },
}

export type SamSystemGroup =
  | 'manpads'
  | 'short_range'
  | 'medium'
  | 'long_range'
  | 'legacy'
  | 'other'

/** Resolve DB system id to SAM profile id (Pantsir C-UAS row maps to SA-22). */
export function resolveSamProfileId(systemId: string): string | null {
  if (systemId === 'pantsir-s1-cuas') return 'sa-22-greyhound'
  if (getSamProfile(systemId)) return systemId
  return null
}

export function platformToUasCategory(platformId: string): UasTargetCategory | null {
  return PLATFORM_TO_CATEGORY[platformId] ?? null
}

export function isSamSystemId(id: string): boolean {
  return id.startsWith('sa-') || id === 'pantsir-s1-cuas'
}

export function getSamSystemGroup(id: string): SamSystemGroup {
  if (
    id === 'sa-7-grail' ||
    id === 'sa-14-gremlin' ||
    id === 'sa-16-gimlet' ||
    id === 'sa-18-grouse' ||
    id === 'sa-24-grinch'
  ) {
    return 'manpads'
  }
  if (
    id === 'sa-8-gecko' ||
    id === 'sa-13-gopher' ||
    id === 'sa-15-gauntlet' ||
    id === 'sa-19-grison' ||
    id === 'sa-22-greyhound' ||
    id === 'pantsir-s1-cuas'
  ) {
    return 'short_range'
  }
  if (id === 'sa-6-gainful' || id === 'sa-11-gadfly' || id === 'sa-17-grizzly') {
    return 'medium'
  }
  if (
    id === 'sa-10-grumble' ||
    id === 'sa-20-gargoyle' ||
    id === 'sa-21-growler' ||
    id === 'sa-23-giant'
  ) {
    return 'long_range'
  }
  if (id === 'sa-2-guideline' || id === 'sa-3-goa' || id === 'sa-12a-gladiator') {
    return 'legacy'
  }
  if (id.startsWith('sa-')) return 'other'
  return 'other'
}

/** Reference-geometry single-shot Pk as integer percent, or null when no SAM profile. */
export function kineticPctFromSam(systemId: string, platformId: string): number | null {
  const profileId = resolveSamProfileId(systemId)
  if (!profileId) return null

  const category = platformToUasCategory(platformId)
  if (!category) return null

  const ref = REFERENCE_ENGAGEMENT[category]
  const result = computeSamIntercept(
    {
      system_id: profileId,
      target_category: category,
      slant_range_m: ref.slant_range_m,
      target_alt_m: ref.target_alt_m,
      ecm_level: 'none',
      salvo_count: 1,
    },
    SAM_PROFILES,
  )

  if (!result) return null
  if (!result.in_envelope) return 0
  return Math.round(result.pk_single * 100)
}

/** Build computedSamPkMap for all SAM × matrix platform pairings. */
export function buildComputedSamPkMap(
  platformIds: string[],
  systemIds: string[],
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const systemId of systemIds) {
    if (!isSamSystemId(systemId)) continue
    if (!resolveSamProfileId(systemId)) continue
    for (const platformId of platformIds) {
      const pct = kineticPctFromSam(systemId, platformId)
      if (pct != null) {
        map[`${platformId}:${systemId}`] = pct
      }
    }
  }
  return map
}
