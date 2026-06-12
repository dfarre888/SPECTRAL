import { createClient } from '@/lib/supabase/server'
import type { DefeatEffectiveness, Platform } from '@/lib/types'

export async function getAllPlatforms(): Promise<Platform[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return ((data ?? []) as Platform[]).map((p) => ({
    ...p,
    gnss_independent: p.gnss_independent ?? false,
    ai_autonomous: p.ai_autonomous ?? false,
    swarm_capable: p.swarm_capable ?? false,
  }))
}

export async function getPlatformById(id: string): Promise<Platform | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    ...(data as Platform),
    gnss_independent: data.gnss_independent ?? false,
    ai_autonomous: data.ai_autonomous ?? false,
    swarm_capable: data.swarm_capable ?? false,
  }
}

export async function getPlatformCountermeasures(
  id: string
): Promise<DefeatEffectiveness[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('defeat_effectiveness')
    .select('*, defeat_system:anti_drone_systems(*)')
    .eq('platform_id', id)
    .order('kinetic_pct', { ascending: false, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    ...row,
    is_immune: row.is_immune ?? false,
    immune_reason: row.immune_reason ?? null,
    adjudication_rationale: row.adjudication_rationale ?? null,
    modifiers: Array.isArray(row.modifiers) ? row.modifiers : [],
    recommended_response: row.recommended_response ?? null,
    swarm_engagement_pct: row.swarm_engagement_pct ?? null,
  })) as DefeatEffectiveness[]
}

export async function getDistinctCountries(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platforms')
    .select('country_of_origin')
    .not('country_of_origin', 'is', null)
    .order('country_of_origin')

  if (error) throw new Error(error.message)

  const countries = new Set<string>()
  for (const row of data ?? []) {
    if (row.country_of_origin) countries.add(row.country_of_origin)
  }
  return Array.from(countries).sort()
}

export async function getPlatformsByIds(ids: string[]): Promise<Platform[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .in('id', ids)

  if (error) throw new Error(error.message)
  return ((data ?? []) as Platform[]).map((p) => ({
    ...p,
    gnss_independent: p.gnss_independent ?? false,
    ai_autonomous: p.ai_autonomous ?? false,
    swarm_capable: p.swarm_capable ?? false,
  }))
}
