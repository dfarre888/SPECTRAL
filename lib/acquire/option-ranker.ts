/**
 * OPTION ranker — effectors by exchange ratio, magazine depth, Pk
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type {
  DefeatCoverageRow,
  RankedAcquireOption,
} from '@/lib/acquire/acquire-types'
import { isSamSystemId } from '@/lib/defeat/sam-matrix-bridge'
import {
  computeExchangeRatio,
  type EconomicsRow,
} from '@/lib/planner/engagement-economics'

const SAM_OVERLAY_IDS = /nasams|patriot|gbad|sm-2|amraam|iris-t|iron-dome|davids-sling|narew|camm/i

function isSamEngagementSystem(systemId: string): boolean {
  return isSamSystemId(systemId) || SAM_OVERLAY_IDS.test(systemId)
}

function resolvePk(coverage: DefeatCoverageRow | undefined): number {
  if (coverage?.kinetic_pct != null && coverage.kinetic_pct > 0) {
    return coverage.kinetic_pct / 100
  }
  return 0.65
}

function buildRationale(
  exchangeRatio: number,
  magazine: number,
  systemName: string,
): string {
  if (exchangeRatio > 50) {
    return `${systemName}: cost catastrophe (${exchangeRatio.toFixed(0)}:1) — reserve for confirmed LACM; not primary OWA layer.`
  }
  if (exchangeRatio > 10) {
    return `${systemName}: unfavourable exchange — cue only when RF/HPM unavailable; magazine ${magazine} rounds.`
  }
  return `${systemName}: favourable point-defence economics; magazine depth ${magazine} supports saturation handling.`
}

export function rankAcquireOptions(
  threatPlatformId: string,
  defeatCoverage: DefeatCoverageRow[],
  economicsRows: EconomicsRow[],
  limit = 3,
): RankedAcquireOption[] {
  const coverageBySystem = new Map(
    defeatCoverage
      .filter((row) => row.platform_id === threatPlatformId && !row.is_immune)
      .map((row) => [row.defeat_system_id, row]),
  )

  const candidates = economicsRows
    .filter((row) => row.platformId === threatPlatformId)
    .map((row) => {
      const coverage = coverageBySystem.get(row.defeatSystemId)
      const pk = resolvePk(coverage)
      const exchange = computeExchangeRatio(row.threatUnitCostUsd, row.unitCostUsd, pk)
      const costPerExpectedKillUsd = row.unitCostUsd / Math.max(pk, 0.01)

      return {
        defeat_system_id: row.defeatSystemId,
        defeat_system_name: coverage?.defeat_system_name ?? row.defeatSystemId,
        platform_id: row.platformId,
        pk,
        cost_per_expected_kill_usd: costPerExpectedKillUsd,
        exchange,
        magazine_rounds: row.magazineRounds,
        reload_min: row.reloadMin,
        cost_confidence: row.costConfidence,
        source_ref: row.sourceRef,
        effectiveness_confidence: coverage?.data_confidence ?? 'estimated',
        is_sam: isSamEngagementSystem(row.defeatSystemId),
        rationale: buildRationale(exchange.exchangeRatio, row.magazineRounds, coverage?.defeat_system_name ?? row.defeatSystemId),
        sortKey: costPerExpectedKillUsd,
      }
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, limit)

  return candidates.map((c, index) => ({
    rank: index + 1,
    defeat_system_id: c.defeat_system_id,
    defeat_system_name: c.defeat_system_name,
    platform_id: c.platform_id,
    pk: c.pk,
    cost_per_expected_kill_usd: c.cost_per_expected_kill_usd,
    exchange: c.exchange,
    magazine_rounds: c.magazine_rounds,
    reload_min: c.reload_min,
    cost_confidence: c.cost_confidence,
    source_ref: c.source_ref,
    effectiveness_confidence: c.effectiveness_confidence,
    is_sam: c.is_sam,
    rationale: c.rationale,
  }))
}
