/**
 * Engagement economics — server fetch from engagement_economics table
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import 'server-only'

import {
  DEMO_SHAhed_ECONOMICS,
} from '@/lib/acquire/acquire-demo-data'
import { getPlatformCountermeasures } from '@/lib/platforms/queries'
import {
  OSINT_THREAT_COSTS_USD,
  type CostConfidence,
  type EconomicsRow,
} from '@/lib/planner/engagement-economics'
import { createClient } from '@/lib/supabase/server'

export interface EngagementEconomicsPanelRow {
  platformId: string
  defeatSystemId: string
  effectorCostUsd: number
  pk: number
  label: string
  costConfidence?: CostConfidence
  sourceRef?: string
  magazineRounds?: number
}

function mapDbConfidence(value: string | null | undefined): CostConfidence {
  const allowed: CostConfidence[] = ['Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected']
  if (value && allowed.includes(value as CostConfidence)) {
    return value as CostConfidence
  }
  return 'Estimated'
}

function resolvePkFromCoverage(
  platformId: string,
  defeatSystemId: string,
  pkMap: Map<string, number>,
): number {
  return pkMap.get(`${platformId}:${defeatSystemId}`) ?? 0.65
}

async function buildPkMap(platformIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  for (const platformId of platformIds) {
    try {
      const rows = await getPlatformCountermeasures(platformId)
      for (const row of rows) {
        if (row.kinetic_pct != null && row.kinetic_pct > 0) {
          map.set(`${platformId}:${row.defeat_system_id}`, row.kinetic_pct / 100)
        }
      }
    } catch {
      // skip platform — fallback pk applied per row
    }
  }
  return map
}

export async function loadEngagementEconomicsRows(
  platformId?: string,
): Promise<EconomicsRow[]> {
  try {
    const supabase = await createClient()
    let query = supabase
      .from('engagement_economics')
      .select('platform_id, defeat_system_id, unit_cost_usd, magazine_rounds, reload_min, cost_confidence, source_ref')
      .order('platform_id')

    if (platformId) {
      query = query.eq('platform_id', platformId)
    }

    const { data, error } = await query
    if (error || !data?.length) {
      return platformId === 'shahed-136' ? DEMO_SHAhed_ECONOMICS : []
    }

    const platformIds = [...new Set(data.map((r) => r.platform_id as string))]
    const pkMap = await buildPkMap(platformIds)

    return data.map((row) => ({
      platformId: row.platform_id as string,
      defeatSystemId: row.defeat_system_id as string,
      unitCostUsd: Number(row.unit_cost_usd ?? 0),
      threatUnitCostUsd: OSINT_THREAT_COSTS_USD[row.platform_id as string] ?? 20_000,
      magazineRounds: Number(row.magazine_rounds ?? 4),
      reloadMin: Number(row.reload_min ?? 30),
      costConfidence: mapDbConfidence(row.cost_confidence as string),
      sourceRef: (row.source_ref as string) || 'OSINT baseline',
    }))
  } catch {
    return platformId === 'shahed-136' ? DEMO_SHAhed_ECONOMICS : []
  }
}

export async function loadEngagementEconomicsPanelRows(
  platformId?: string,
): Promise<EngagementEconomicsPanelRow[]> {
  const rows = await loadEngagementEconomicsRows(platformId)
  const fallback = platformId === 'shahed-136' ? DEMO_SHAhed_ECONOMICS : rows

  const effective = rows.length ? rows : fallback
  const platformIds = [...new Set(effective.map((r) => r.platformId))]
  const pkMap = await buildPkMap(platformIds)

  return effective.map((row) => ({
    platformId: row.platformId,
    defeatSystemId: row.defeatSystemId,
    effectorCostUsd: row.unitCostUsd,
    pk: resolvePkFromCoverage(row.platformId, row.defeatSystemId, pkMap),
    label: `${row.platformId} vs ${row.defeatSystemId}`,
    costConfidence: row.costConfidence,
    sourceRef: row.sourceRef,
    magazineRounds: row.magazineRounds,
  }))
}
