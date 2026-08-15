import 'server-only'
import { allA3dmPlatforms, a3dmDroneToPlatform } from '@/lib/a3dm/to-platform'
import { getA3dmDrone } from '@/lib/a3dm/catalog'
import { isCotsPlatform, synthesizeCotsCountermeasures } from '@/lib/a3dm/cots-defeat'
import { createClient } from '@/lib/supabase/server'
import { getSeedPlatformById } from '@/lib/platforms/seed-fallback'
import { PLATFORMS } from '@/data/seed-platforms'
import { seedPlatformToRecord } from '@/lib/platforms/seed-fallback'
import type { DefeatEffectiveness, Platform } from '@/lib/types'

function enrichFromA3dm(existing: Platform, a3dm: Platform): Platform {
  return {
    ...existing,
    a3dm_drone_id: a3dm.a3dm_drone_id ?? existing.a3dm_drone_id,
    dry_weight_kg: a3dm.dry_weight_kg ?? existing.dry_weight_kg,
    max_payload_kg: a3dm.max_payload_kg ?? existing.max_payload_kg,
    a3dm_category: a3dm.a3dm_category ?? existing.a3dm_category,
    sub_category: a3dm.sub_category ?? existing.sub_category,
    catalog_tier: existing.catalog_tier ?? a3dm.catalog_tier,
    retired: a3dm.retired ?? existing.retired,
    mtow_kg: existing.mtow_kg ?? a3dm.mtow_kg,
    range_km: existing.range_km ?? a3dm.range_km,
    max_speed_kmh: existing.max_speed_kmh ?? a3dm.max_speed_kmh,
    endurance_hrs: existing.endurance_hrs ?? a3dm.endurance_hrs,
    service_ceiling_m: existing.service_ceiling_m ?? a3dm.service_ceiling_m,
    manufacturer: existing.manufacturer || a3dm.manufacturer,
    sensor_suite: existing.sensor_suite?.length ? existing.sensor_suite : a3dm.sensor_suite,
    sources: [...new Set([...(existing.sources ?? []), ...(a3dm.sources ?? [])])],
  }
}

function mergePlatformCatalog(dbRows: Platform[]): Platform[] {
  const byId = new Map(dbRows.map((p) => [p.id, p]))
  for (const seed of PLATFORMS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seedPlatformToRecord(seed))
  }
  for (const a3dm of allA3dmPlatforms()) {
    const existing = byId.get(a3dm.id)
    byId.set(a3dm.id, existing ? enrichFromA3dm(existing, a3dm) : a3dm)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getPlatformCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('platforms')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function getAllPlatforms(): Promise<Platform[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .order('name')

    if (error) throw new Error(error.message)
    const rows = ((data ?? []) as Platform[]).map((p) => ({
      ...p,
      gnss_independent: p.gnss_independent ?? false,
      ai_autonomous: p.ai_autonomous ?? false,
      swarm_capable: p.swarm_capable ?? false,
    }))
    return mergePlatformCatalog(rows)
  } catch {
    return mergePlatformCatalog([])
  }
}

export async function getPlatformById(id: string): Promise<Platform | null> {
  const a3dmDrone = getA3dmDrone(id)
  const a3dm = a3dmDrone ? a3dmDroneToPlatform(a3dmDrone) : null
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return getSeedPlatformById(id) ?? a3dm
    const row = {
      ...(data as Platform),
      gnss_independent: data.gnss_independent ?? false,
      ai_autonomous: data.ai_autonomous ?? false,
      swarm_capable: data.swarm_capable ?? false,
    }
    return a3dm ? enrichFromA3dm(row, a3dm) : row
  } catch {
    return getSeedPlatformById(id) ?? a3dm
  }
}

export async function getPlatformCountermeasures(
  id: string
): Promise<DefeatEffectiveness[]> {
  try {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('defeat_effectiveness')
    .select('*, defeat_system:anti_drone_systems(*)')
    .eq('platform_id', id)
    .order('kinetic_pct', { ascending: false, nullsFirst: false })

  if (error || !data?.length) {
    const platform = await getPlatformById(id)
    if (platform && isCotsPlatform(platform)) return synthesizeCotsCountermeasures(id)
    if (error) throw new Error(error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    ...row,
    is_immune: row.is_immune ?? false,
    immune_reason: row.immune_reason ?? null,
    adjudication_rationale: row.adjudication_rationale ?? null,
    modifiers: Array.isArray(row.modifiers) ? row.modifiers : [],
    recommended_response: row.recommended_response ?? null,
    swarm_engagement_pct: row.swarm_engagement_pct ?? null,
  })) as DefeatEffectiveness[]
  } catch {
    const platform = await getPlatformById(id)
    if (platform && isCotsPlatform(platform)) return synthesizeCotsCountermeasures(id)
    return []
  }
}

export async function getDistinctCountries(): Promise<string[]> {
  const platforms = await getAllPlatforms()
  const countries = new Set<string>()
  for (const p of platforms) {
    if (p.country_of_origin) countries.add(p.country_of_origin)
  }
  return Array.from(countries).sort()
}

export async function getPlatformsByIds(ids: string[]): Promise<Platform[]> {
  if (ids.length === 0) return []
  const wanted = new Set(ids)
  return (await getAllPlatforms()).filter((p) => wanted.has(p.id))
}
