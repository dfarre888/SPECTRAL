import 'server-only'

import { PLATFORMS } from '@/data/seed-platforms'
import type { Platform as SeedPlatform } from '@/lib/spectrum/types'
import type { GnssDependency, GuidanceType, Platform, PlatformCategory } from '@/lib/types'

function inferCategory(seed: SeedPlatform): PlatformCategory {
  const c = (seed.category ?? '').toLowerCase()
  if (c.includes('male')) return 'MALE'
  if (c.includes('hale')) return 'HALE'
  if (c.includes('fpv') || c.includes('cots') || c.includes('quad')) return 'FPV'
  if (c.includes('loiter')) return 'loitering_munition'
  if (c.includes('naval') || c.includes('usv')) return 'naval'
  if (c.includes('vtol')) return 'VTOL'
  if (seed.group === 1) return 'FPV'
  if (seed.group === 2) return 'tactical'
  if (seed.group === 3) return 'MALE'
  return 'tactical'
}

/** Map OSINT seed library row → Supabase-shaped Platform for dossier pages. */
export function seedPlatformToRecord(seed: SeedPlatform): Platform {
  const gnssDep = seed.gnss_dependency ?? null
  return {
    id: seed.id,
    name: seed.name,
    manufacturer: seed.origin?.includes('(')
      ? seed.origin.split('(').pop()?.replace(')', '') ?? seed.origin
      : seed.origin ?? null,
    country_of_origin: seed.origin?.split('(')[0]?.trim() ?? seed.origin ?? null,
    nato_reporting_name: null,
    category: inferCategory(seed),
    guidance_type: (seed.guidance_type as GuidanceType | null) ?? null,
    gnss_independent: gnssDep === 'none' || gnssDep === 'low',
    ai_autonomous: false,
    swarm_capable: false,
    intel_update_date: '2026-07-01',
    max_speed_kmh: seed.speed_kmh ?? null,
    service_ceiling_m: seed.ceiling_m ?? null,
    range_km: seed.range_km ?? null,
    endurance_hrs: null,
    mtow_kg: seed.mass_kg ?? null,
    warhead_kg: seed.warhead_kg ?? null,
    length_m: seed.length_m ?? null,
    wingspan_m: seed.wingspan_m ?? null,
    height_m: seed.height_m ?? null,
    unit_cost_usd: seed.unit_cost_usd ?? null,
    ioc_year: seed.ioc_year ?? seed.year_introduced ?? null,
    terminal_speed_kmh: seed.terminal_speed_kmh ?? null,
    armor_piercing_mm: seed.armor_piercing_mm ?? null,
    engine_type: seed.engine_type ?? seed.propulsion ?? null,
    radar_cross_section_m2: null,
    rcs_notes: null,
    c2_uplink_mhz: seed.c2_uplink_mhz != null ? [seed.c2_uplink_mhz] : null,
    c2_downlink_mhz: seed.c2_downlink_mhz != null ? [seed.c2_downlink_mhz] : null,
    data_link_mhz: seed.datalink_mhz != null ? [seed.datalink_mhz] : null,
    frequency_hopping: null,
    gnss_used: seed.gnss_used ?? [],
    rtk_capable: false,
    nav_backup: [],
    stealth_features: [],
    payload_hardpoints: null,
    weapon_types: [],
    sensor_suite: [],
    known_operators: [],
    conflict_deployments: [],
    itar_controlled: false,
    data_confidence: seed.confidence === 'curated' ? 'high' : 'estimated',
    sources: seed.intel_note ? [seed.intel_note] : [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    year_introduced: seed.year_introduced ?? null,
    propulsion: seed.propulsion ?? null,
    defeat_note: seed.defeat_note ?? null,
    control_link_freq: seed.control_link_freq ?? null,
    gnss_dependency: gnssDep as GnssDependency | null,
    side: seed.side ?? null,
    uas_group: seed.group ?? null,
  }
}

export function getSeedPlatformById(id: string): Platform | null {
  const seed = PLATFORMS.find((p) => p.id === id)
  return seed ? seedPlatformToRecord(seed) : null
}
