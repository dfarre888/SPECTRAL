/**
 * Capability Acquisition — server data loaders
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import 'server-only'

import {
  DEMO_SHAhed_DEFEAT_COVERAGE,
  DEMO_SHAhed_ECONOMICS,
  demoDarwinOrbat,
} from '@/lib/acquire/acquire-demo-data'
import { buildAcquireSessionFromData } from '@/lib/acquire/acquire-session'
import { getAcquireTemplate } from '@/lib/acquire/acquire-templates'
import type {
  AcquireSession,
  DefeatCoverageRow,
  OrbatPlatformSummary,
} from '@/lib/acquire/acquire-types'
import { fetchBmiExercise } from '@/lib/bmi/bmi-queries'
import { getDefeatMatrixData } from '@/lib/defeat/queries'
import { getPlatformCountermeasures } from '@/lib/platforms/queries'
import { loadEngagementEconomicsRows } from '@/lib/planner/engagement-economics-queries'
import type { EconomicsRow } from '@/lib/planner/engagement-economics'
import { OSINT_THREAT_COSTS_USD } from '@/lib/planner/engagement-economics'

export async function loadDefeatCoverage(threatPlatformId: string): Promise<DefeatCoverageRow[]> {
  try {
    const [matrix, countermeasures] = await Promise.all([
      getDefeatMatrixData(),
      getPlatformCountermeasures(threatPlatformId),
    ])

    const systemNameById = new Map(matrix.systems.map((s) => [s.id, s.name]))

    if (countermeasures.length) {
      return countermeasures.map((row) => ({
        platform_id: row.platform_id,
        defeat_system_id: row.defeat_system_id,
        defeat_system_name:
          row.defeat_system?.name ??
          systemNameById.get(row.defeat_system_id) ??
          row.defeat_system_id,
        kinetic_pct: row.kinetic_pct,
        rf_jamming_pct: row.rf_jamming_pct,
        dew_pct: row.dew_pct,
        data_confidence: row.data_confidence,
        is_immune: row.is_immune,
        special_notes: row.special_notes,
      }))
    }
  } catch {
    // fall through to demo
  }

  return threatPlatformId === 'shahed-136' ? DEMO_SHAhed_DEFEAT_COVERAGE : []
}

export async function loadDarwinOrbat(baseId = 'BASE-DARWIN'): Promise<OrbatPlatformSummary[]> {
  try {
    const exercise = await fetchBmiExercise('PITCH_BLACK_2026')
    const filtered = exercise.platforms
      .filter((p) => p.base_id === baseId)
      .map((p) => ({
        id: p.id,
        designation: p.designation,
        short_name: p.short_name,
        domain: p.domain,
        role: p.role,
        nation_code: p.nation_code,
        force_side: p.force_side,
      }))

    if (filtered.length) return filtered
  } catch {
    // demo fallback
  }

  return demoDarwinOrbat()
}

export async function loadEconomicsRows(threatPlatformId: string): Promise<EconomicsRow[]> {
  const rows = await loadEngagementEconomicsRows(threatPlatformId)
  if (rows.length) return rows

  if (threatPlatformId === 'shahed-136') {
    return DEMO_SHAhed_ECONOMICS
  }

  return [
    {
      platformId: threatPlatformId,
      defeatSystemId: 'gepard-spaag',
      unitCostUsd: 40_000,
      threatUnitCostUsd: OSINT_THREAT_COSTS_USD[threatPlatformId] ?? 20_000,
      magazineRounds: 1000,
      reloadMin: 0.5,
      costConfidence: 'Estimated',
      sourceRef: 'OSINT baseline — engagement_economics unavailable',
    },
  ]
}

export async function buildAcquireSession(templateId: string): Promise<AcquireSession> {
  const template = getAcquireTemplate(templateId)

  const [defeatCoverage, darwinOrbat, economicsRows] = await Promise.all([
    loadDefeatCoverage(template.threat_platform_id),
    loadDarwinOrbat(template.base_id),
    loadEconomicsRows(template.threat_platform_id),
  ])

  let threatName = template.threat_platform_id
  try {
    const matrix = await getDefeatMatrixData()
    const platform = matrix.platforms.find((p) => p.id === template.threat_platform_id)
    if (platform?.name) threatName = platform.name
  } catch {
    if (template.threat_platform_id === 'shahed-136') threatName = 'Shahed-136'
  }

  return buildAcquireSessionFromData(template, {
    defeatCoverage,
    darwinOrbat,
    economicsRows,
    threatName,
  })
}
