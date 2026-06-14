/**
 * Server-side defeat matrix lookup with per-turn cache.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveCellValue, type CellValue } from '@/lib/defeat/cell-value';
import type { DefeatTypeFilter } from '@/lib/defeat/defeat-types';
import type { PCM } from '@/lib/pcm/spectral.types';
import {
  resolveDefenderSystemId,
  resolvePcmPlatformId,
} from '@/lib/pcm/pcm-platform-ids';
import type { AntiDroneSystem, DefeatEffectiveness, Platform } from '@/lib/types';

export interface DefeatLookupResult {
  defeatMatrixPk: number | null;
  isImmune: boolean;
  immuneReason: string | null;
  swarmEngagementPct: number | null;
  defeatType: DefeatTypeFilter;
}

/** OSINT fallback rows when Supabase unavailable (tests / offline). */
const OFFLINE_EFFECTIVENESS: DefeatEffectiveness[] = [
  {
    id: 'offline-shahed-coyote',
    platform_id: 'shahed-136',
    defeat_system_id: 'coyote-block-3',
    rf_jamming_pct: 40,
    kinetic_pct: 70,
    dew_pct: null,
    is_immune: false,
    immune_reason: null,
    swarm_engagement_pct: 45,
    data_confidence: 'high',
    weather_limited: false,
    special_notes: null,
    adjudication_rationale: null,
    modifiers: [],
    recommended_response: null,
  },
  {
    id: 'offline-gerbera-coyote',
    platform_id: 'gerbera-parody',
    defeat_system_id: 'coyote-block-3',
    rf_jamming_pct: 35,
    kinetic_pct: 68,
    dew_pct: null,
    is_immune: false,
    immune_reason: null,
    swarm_engagement_pct: 50,
    data_confidence: 'medium',
    weather_limited: false,
    special_notes: null,
    adjudication_rationale: null,
    modifiers: [],
    recommended_response: null,
  },
  {
    id: 'offline-shahed-dronegun',
    platform_id: 'shahed-136',
    defeat_system_id: 'dronegun-tactical',
    rf_jamming_pct: 30,
    kinetic_pct: null,
    dew_pct: null,
    is_immune: false,
    immune_reason: null,
    swarm_engagement_pct: 25,
    data_confidence: 'estimated',
    weather_limited: false,
    special_notes: null,
    adjudication_rationale: null,
    modifiers: [],
    recommended_response: null,
  },
  {
    id: 'offline-lancet-coyote',
    platform_id: 'lancet-3',
    defeat_system_id: 'coyote-block-3',
    rf_jamming_pct: 45,
    kinetic_pct: 50,
    dew_pct: null,
    is_immune: false,
    immune_reason: null,
    swarm_engagement_pct: 40,
    data_confidence: 'medium',
    weather_limited: false,
    special_notes: null,
    adjudication_rationale: null,
    modifiers: [],
    recommended_response: null,
  },
  {
    id: 'offline-fpv-coyote',
    platform_id: 'fpv-fibre-optic',
    defeat_system_id: 'coyote-block-3',
    rf_jamming_pct: 0,
    kinetic_pct: 60,
    dew_pct: null,
    is_immune: false,
    immune_reason: null,
    swarm_engagement_pct: 35,
    data_confidence: 'medium',
    weather_limited: false,
    special_notes: null,
    adjudication_rationale: null,
    modifiers: [],
    recommended_response: null,
  },
];

const OFFLINE_SYSTEMS: AntiDroneSystem[] = [
  {
    id: 'coyote-block-3',
    name: 'Coyote Block 3',
    manufacturer: 'Raytheon',
    country: 'United States',
    defeat_method: ['kinetic'],
    effective_range_m: 15000,
    frequency_bands_covered_mhz: {},
    power_output_w: null,
    weight_kg: null,
    portability: 'vehicle',
    price_usd_approx: null,
    platforms_can_defeat: [],
    conflict_validated: true,
    conflict_notes: null,
    sources: [],
    data_confidence: 'high',
  },
  {
    id: 'dronegun-tactical',
    name: 'DroneGun Tactical',
    manufacturer: 'DroneShield',
    country: 'Australia',
    defeat_method: ['RF_jamming'],
    effective_range_m: 2000,
    frequency_bands_covered_mhz: {},
    power_output_w: null,
    weight_kg: null,
    portability: 'man-portable',
    price_usd_approx: null,
    platforms_can_defeat: [],
    conflict_validated: true,
    conflict_notes: null,
    sources: [],
    data_confidence: 'high',
  },
  {
    id: 'drone-dome',
    name: 'Drone Dome',
    manufacturer: 'Rafael',
    country: 'Israel',
    defeat_method: ['RF_jamming', 'kinetic'],
    effective_range_m: 3500,
    frequency_bands_covered_mhz: {},
    power_output_w: null,
    weight_kg: null,
    portability: 'vehicle',
    price_usd_approx: null,
    platforms_can_defeat: [],
    conflict_validated: true,
    conflict_notes: null,
    sources: [],
    data_confidence: 'high',
  },
];

const OFFLINE_PLATFORMS: Partial<Platform>[] = [
  {
    id: 'shahed-136',
    name: 'Shahed-136',
    guidance_type: 'preprogrammed',
    gnss_independent: false,
  },
  {
    id: 'fpv-fibre-optic',
    name: 'FPV Fibre Optic',
    guidance_type: 'fibre_optic',
    gnss_independent: true,
  },
];

function defeatTypeForGroup(group: string): DefeatTypeFilter {
  if (group === 'c_uas_defeat_kinetic') return 'Kinetic';
  if (group === 'c_uas_defeat_dew') return 'DEW';
  if (group === 'c_uas_defeat_ew') return 'RF';
  return 'all';
}

function cellToLookup(cell: CellValue, swarmPct: number | null, defeatType: DefeatTypeFilter): DefeatLookupResult {
  if (cell.kind === 'immune') {
    return {
      defeatMatrixPk: null,
      isImmune: true,
      immuneReason: cell.reason,
      swarmEngagementPct: swarmPct,
      defeatType,
    };
  }
  if (cell.kind === 'empty') {
    return {
      defeatMatrixPk: null,
      isImmune: false,
      immuneReason: null,
      swarmEngagementPct: swarmPct,
      defeatType,
    };
  }
  return {
    defeatMatrixPk: cell.value,
    isImmune: false,
    immuneReason: null,
    swarmEngagementPct: swarmPct,
    defeatType,
  };
}

export class DefeatMatrixCache {
  private cache = new Map<string, DefeatLookupResult>();
  private platforms = new Map<string, Platform>();
  private systems = new Map<string, AntiDroneSystem>();
  private effectiveness = new Map<string, DefeatEffectiveness>();

  private constructor() {}

  static createOffline(): DefeatMatrixCache {
    const c = new DefeatMatrixCache();
    for (const p of OFFLINE_PLATFORMS) {
      if (p.id) c.platforms.set(p.id, p as Platform);
    }
    for (const s of OFFLINE_SYSTEMS) c.systems.set(s.id, s);
    for (const row of OFFLINE_EFFECTIVENESS) {
      c.effectiveness.set(`${row.platform_id}:${row.defeat_system_id}`, row);
    }
    return c;
  }

  static async create(
    supabase: SupabaseClient | null,
    threatTypes: string[],
    defenderTypes: string[],
  ): Promise<DefeatMatrixCache> {
    if (!supabase) return DefeatMatrixCache.createOffline();

    const cache = new DefeatMatrixCache();
    const platformIds = [...new Set(threatTypes.map(resolvePcmPlatformId).filter(Boolean))] as string[];
    const systemIds = [
      ...new Set(defenderTypes.map((t, i) => resolveDefenderSystemId(t, ''))),
    ];

    try {
      const [platRes, sysRes, effRes] = await Promise.all([
        platformIds.length
          ? supabase.from('platforms').select('*').in('id', platformIds)
          : Promise.resolve({ data: [], error: null }),
        systemIds.length
          ? supabase.from('anti_drone_systems').select('*').in('id', systemIds)
          : Promise.resolve({ data: [], error: null }),
        platformIds.length && systemIds.length
          ? supabase
              .from('defeat_effectiveness')
              .select('*')
              .in('platform_id', platformIds)
              .in('defeat_system_id', systemIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (platRes.error || sysRes.error || effRes.error) {
        return DefeatMatrixCache.createOffline();
      }

      for (const p of (platRes.data ?? []) as Platform[]) cache.platforms.set(p.id, p);
      for (const s of (sysRes.data ?? []) as AntiDroneSystem[]) cache.systems.set(s.id, s);
      for (const row of (effRes.data ?? []) as DefeatEffectiveness[]) {
        cache.effectiveness.set(`${row.platform_id}:${row.defeat_system_id}`, {
          ...row,
          is_immune: row.is_immune ?? false,
          swarm_engagement_pct: row.swarm_engagement_pct ?? null,
        });
      }

      if (cache.effectiveness.size === 0) return DefeatMatrixCache.createOffline();
      return cache;
    } catch {
      return DefeatMatrixCache.createOffline();
    }
  }

  lookup(threat: PCM.Platform, defender: PCM.Platform): DefeatLookupResult {
    const key = `${threat.id}:${defender.id}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const platformId = resolvePcmPlatformId(threat.type);
    const systemId = resolveDefenderSystemId(defender.type, defender.group);
    const effKey = `${platformId}:${systemId}`;
    const defeatType = defeatTypeForGroup(defender.group);

    const platform = platformId ? this.platforms.get(platformId) : undefined;
    const system = this.systems.get(systemId);
    const row = this.effectiveness.get(effKey);

    const cell = resolveCellValue(
      platform ?? ({
        id: platformId ?? threat.id,
        name: threat.type,
        guidance_type: threat.guidance?.includes('fibre') ? 'fibre_optic' : 'GNSS_INS',
        gnss_independent: threat.ew_immune ?? false,
      } as Platform),
      system ?? ({
        id: systemId,
        name: defender.type,
        defeat_method:
          defender.group === 'c_uas_defeat_ew'
            ? ['RF_jamming']
            : defender.group === 'c_uas_defeat_dew'
              ? ['directed_energy']
              : ['kinetic'],
      } as AntiDroneSystem),
      row,
      defeatType,
    );

    const result = cellToLookup(cell, row?.swarm_engagement_pct ?? null, defeatType);
    this.cache.set(key, result);
    return result;
  }
}
