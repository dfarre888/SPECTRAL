import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types'
import { getPrimaryDefeatType } from '@/lib/defeat/defeat-types'
import type { AntiDroneSystem, Platform } from '@/lib/types'

/**
 * Generic Group 1–2 COTS Pk — OSINT-estimated training defaults.
 * Used when no dedicated defeat_effectiveness row exists.
 */
const COTS_DEFAULTS: Record<string, { rf: number | null; kinetic: number | null; dew: number | null }> = {
  'dronegun-tactical': { rf: 72, kinetic: null, dew: null },
  'drone-dome': { rf: 68, kinetic: 70, dew: null },
  'leonidas-hpm': { rf: null, kinetic: null, dew: 72 },
  'iron-beam': { rf: null, kinetic: null, dew: 82 },
  'dragonfire-uk': { rf: null, kinetic: null, dew: 80 },
  'helios-60kw': { rf: null, kinetic: null, dew: 70 },
  'enforceair': { rf: 60, kinetic: null, dew: null },
  'lids-system': { rf: 55, kinetic: 62, dew: null },
  'anduril-lattice': { rf: 55, kinetic: 65, dew: null },
  'coyote-block-3': { rf: null, kinetic: 58, dew: null },
}

const GENERIC: Record<DefeatTypeFilter, number> = {
  all: 62,
  RF: 65,
  Kinetic: 58,
  DEW: 72,
  Net: 45,
}

export function isCotsPlatform(platform: Platform): boolean {
  return platform.catalog_tier === 'cots' || platform.category === 'cots'
}

export function synthesizeCotsCountermeasures(platformId: string): import('@/lib/types').DefeatEffectiveness[] {
  return Object.entries(COTS_DEFAULTS).map(([systemId, pct]) => ({
    id: `cots-${platformId}-${systemId}`,
    platform_id: platformId,
    defeat_system_id: systemId,
    rf_jamming_pct: pct.rf,
    kinetic_pct: pct.kinetic,
    dew_pct: pct.dew,
    data_confidence: 'estimated',
    is_immune: false,
    immune_reason: null,
    adjudication_rationale: 'COTS Group 1–2 generic Pk — OSINT training default pending pair-specific row',
    modifiers: [],
    recommended_response: 'Layer RF (DroneGun/EnforceAir) with HPM/HEL. Cue with radar/EO.',
    weather_limited: systemId.includes('beam') || systemId.includes('dragon') || systemId.includes('helios'),
    swarm_engagement_pct: pct.rf ?? pct.dew ?? 50,
    special_notes: 'A3DM COTS catalog default',
  }))
}

export function resolveCotsDefeatPct(
  platform: Platform,
  system: AntiDroneSystem,
  filter: DefeatTypeFilter = 'all',
): number | null {
  if (!isCotsPlatform(platform)) return null
  const row = COTS_DEFAULTS[system.id]
  const primary = getPrimaryDefeatType(system)
  if (row) {
    if (filter === 'RF') return row.rf
    if (filter === 'DEW') return row.dew
    if (filter === 'Kinetic' || filter === 'Net') return row.kinetic
    if (primary === 'RF') return row.rf
    if (primary === 'DEW') return row.dew
    if (primary === 'Kinetic' || primary === 'Net') return row.kinetic
    return row.dew ?? row.kinetic ?? row.rf
  }
  return GENERIC[filter] ?? GENERIC.all
}
