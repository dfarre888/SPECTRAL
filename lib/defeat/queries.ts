import { createClient } from '@/lib/supabase/server'
import type { DefeatMatrixPayload } from '@/lib/types'

export async function getDefeatMatrixData(): Promise<DefeatMatrixPayload> {
  const supabase = await createClient()

  const [platformsRes, systemsRes, effectivenessRes] = await Promise.all([
    supabase.from('platforms').select('*').order('name'),
    supabase.from('anti_drone_systems').select('*').order('name'),
    supabase.from('defeat_effectiveness').select('*'),
  ])

  if (platformsRes.error) throw new Error(platformsRes.error.message)
  if (systemsRes.error) throw new Error(systemsRes.error.message)
  if (effectivenessRes.error) throw new Error(effectivenessRes.error.message)

  return {
    systems: systemsRes.data ?? [],
    effectiveness: (effectivenessRes.data ?? []).map((row) => ({
      ...row,
      is_immune: row.is_immune ?? false,
      immune_reason: row.immune_reason ?? null,
      adjudication_rationale: row.adjudication_rationale ?? null,
      modifiers: Array.isArray(row.modifiers) ? row.modifiers : [],
      recommended_response: row.recommended_response ?? null,
      swarm_engagement_pct: row.swarm_engagement_pct ?? null,
    })),
    platforms: (platformsRes.data ?? []).map((p) => ({
      ...p,
      gnss_independent: p.gnss_independent ?? false,
      ai_autonomous: p.ai_autonomous ?? false,
      swarm_capable: p.swarm_capable ?? false,
    })),
  }
}
