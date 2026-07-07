import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { buildComputedSamPkMap, SAM_MATRIX_PLATFORMS, isSamSystemId } from '@/lib/defeat/sam-matrix-bridge'
import type { AccreditedDefeatPkRow, DefeatMatrixPayload } from '@/lib/types'
import { fetchAllAccreditedDefeatPk } from '@/lib/operations/accredited-supplements'

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

  const platforms = (platformsRes.data ?? []).map((p) => ({
    ...p,
    gnss_independent: p.gnss_independent ?? false,
    ai_autonomous: p.ai_autonomous ?? false,
    swarm_capable: p.swarm_capable ?? false,
  }))
  const systems = systemsRes.data ?? []

  let accreditedPkMap: Record<string, AccreditedDefeatPkRow> | undefined
  if (process.env.SPECTRAL_ACCREDITED_RESOLVER === 'true') {
    const catalogMap = await fetchAllAccreditedDefeatPk(
      platforms.map((p) => p.id),
      systems.map((s) => s.id),
    )
    if (catalogMap.size > 0) {
      accreditedPkMap = Object.fromEntries(catalogMap)
    }
  }

  // Scope to SAM_MATRIX_PLATFORMS × SAM system IDs only — avoids O(all × all) wasted loops
  const samPlatformIds = platforms
    .map((p) => p.id)
    .filter((id) => (SAM_MATRIX_PLATFORMS as readonly string[]).includes(id))
  const samSystemIds = systems.map((s) => s.id).filter(isSamSystemId)
  const computedSamPkMap = buildComputedSamPkMap(samPlatformIds, samSystemIds)

  return {
    systems,
    effectiveness: (effectivenessRes.data ?? []).map((row) => ({
      ...row,
      is_immune: row.is_immune ?? false,
      immune_reason: row.immune_reason ?? null,
      adjudication_rationale: row.adjudication_rationale ?? null,
      modifiers: Array.isArray(row.modifiers) ? row.modifiers : [],
      recommended_response: row.recommended_response ?? null,
      swarm_engagement_pct: row.swarm_engagement_pct ?? null,
    })),
    platforms,
    accreditedPkMap,
    computedSamPkMap,
  }
}
