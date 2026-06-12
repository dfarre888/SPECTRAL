/**
 * Unified platform catalogue metadata — IDs, tiers, aliases.
 * CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import { CORE_PLATFORMS, PLATFORMS } from '@/data/seed-platforms';
import { PLATFORM_ID_ALIASES } from '@/data/osint-platform-enrichment';
import {
  TIER1_CONFLICT,
  TIER2_ENCYCLOPEDIC,
  TIER3_PROMOTED,
  TIER5_MARITIME,
  TIER_BLUE_EXPANSION,
} from '@/data/catalogue-expansion';

export type CatalogueTier =
  | 'core'
  | 'tier3_promoted'
  | 'tier1_conflict'
  | 'tier2_encyclopedic'
  | 'tier5_maritime'
  | 'tier4_effector';

export const TIER_PLATFORM_IDS: Record<CatalogueTier, string[]> = {
  core: CORE_PLATFORMS.map((p) => p.id),
  tier3_promoted: TIER3_PROMOTED.map((p) => p.id),
  tier1_conflict: TIER1_CONFLICT.map((p) => p.id),
  tier2_encyclopedic: TIER2_ENCYCLOPEDIC.map((p) => p.id),
  tier5_maritime: TIER5_MARITIME.map((p) => p.id),
  tier4_effector: TIER_BLUE_EXPANSION.map((p) => p.id),
};

export const ALL_PLATFORM_IDS: string[] = [
  ...new Set(Object.values(TIER_PLATFORM_IDS).flat()),
];

export function seedIdToSupabaseId(seedId: string): string {
  return PLATFORM_ID_ALIASES[seedId] ?? seedId;
}

export function supabaseIdToSeedId(supabaseId: string): string {
  const hit = Object.entries(PLATFORM_ID_ALIASES).find(([, v]) => v === supabaseId);
  return hit?.[0] ?? supabaseId;
}

export const CATALOGUE_META = {
  date: '2026-06-12',
  classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
  totalPlatforms: ALL_PLATFORM_IDS.length,
  tiers: {
    core: TIER_PLATFORM_IDS.core.length,
    tier3_promoted: TIER_PLATFORM_IDS.tier3_promoted.length,
    tier1_conflict: TIER_PLATFORM_IDS.tier1_conflict.length,
    tier2_encyclopedic: TIER_PLATFORM_IDS.tier2_encyclopedic.length,
    tier5_maritime: TIER_PLATFORM_IDS.tier5_maritime.length,
    tier4_effector: TIER_PLATFORM_IDS.tier4_effector.length,
  },
} as const;
