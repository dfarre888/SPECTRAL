import 'server-only'
import { allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import { createClient } from '@/lib/supabase/server'
import { OFFLINE_DEFEAT_SYSTEMS } from '@/lib/pcm/defeat-matrix-offline-data'
import { buildComputedSamPkMap, SAM_MATRIX_PLATFORMS, isSamSystemId } from '@/lib/defeat/sam-matrix-bridge'
import type { AccreditedDefeatPkRow, AntiDroneSystem, DefeatEffectiveness, DefeatMatrixPayload, Platform } from '@/lib/types'
import { fetchAllAccreditedDefeatPk } from '@/lib/operations/accredited-supplements'

function mergeDefeatPlatforms(dbRows: Platform[]): Platform[] {
  const seen = new Set(dbRows.map((p) => p.id))
  return [...dbRows, ...allA3dmPlatforms().filter((p) => !seen.has(p.id))]
}

export async function getDefeatMatrixData(): Promise<DefeatMatrixPayload> {
  let platforms: Platform[] = []
  let systems: AntiDroneSystem[] = OFFLINE_DEFEAT_SYSTEMS
  let effectiveness: DefeatEffectiveness[] = []

  try {
    const supabase = await createClient()
    const [platformsRes, systemsRes, effectivenessRes] = await Promise.all([
      supabase.from('platforms').select('*').order('name'),
      supabase.from('anti_drone_systems').select('*').order('name'),
      supabase.from('defeat_effectiveness').select('*'),
    ])

    if (!platformsRes.error && !systemsRes.error && !effectivenessRes.error) {
      platforms = mergeDefeatPlatforms(
        (platformsRes.data ?? []).map((p) => ({
          ...p,
          gnss_independent: p.gnss_independent ?? false,
          ai_autonomous: p.ai_autonomous ?? false,
          swarm_capable: p.swarm_capable ?? false,
        })) as Platform[],
      )
      systems = (systemsRes.data ?? []) as AntiDroneSystem[]
      effectiveness = (effectivenessRes.data ?? []).map((row) => ({
        ...row,
        is_immune: row.is_immune ?? false,
        immune_reason: row.immune_reason ?? null,
        adjudication_rationale: row.adjudication_rationale ?? null,
        modifiers: Array.isArray(row.modifiers) ? row.modifiers : [],
        recommended_response: row.recommended_response ?? null,
        swarm_engagement_pct: row.swarm_engagement_pct ?? null,
      })) as DefeatEffectiveness[]
    } else {
      platforms = mergeDefeatPlatforms([])
    }
  } catch {
    platforms = mergeDefeatPlatforms([])
  }

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

  const samPlatformIds = platforms
    .map((p) => p.id)
    .filter((id) => (SAM_MATRIX_PLATFORMS as readonly string[]).includes(id))
  const samSystemIds = systems.map((s) => s.id).filter(isSamSystemId)
  const computedSamPkMap = buildComputedSamPkMap(samPlatformIds, samSystemIds)

  return {
    systems,
    effectiveness,
    platforms,
    accreditedPkMap,
    computedSamPkMap,
  }
}
