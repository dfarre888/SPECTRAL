/**
 * Acquire session assembly — pure pipeline (testable without Supabase)
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type {
  AcquireCalcResult,
  AcquireSession,
  AcquireSessionInputs,
  AcquireTemplate,
} from '@/lib/acquire/acquire-types'
import { buildAcquisitionBrief } from '@/lib/acquire/brief-builder'
import { analyzeGap } from '@/lib/acquire/gap-analyzer'
import { rankAcquireOptions } from '@/lib/acquire/option-ranker'

function buildCalc(
  template: AcquireTemplate,
  options: ReturnType<typeof rankAcquireOptions>,
  economicsRows: AcquireSessionInputs['economicsRows'],
): AcquireCalcResult {
  const panelRows = options.map((o) => ({
    platformId: o.platform_id,
    defeatSystemId: o.defeat_system_id,
    effectorCostUsd: o.exchange.effectorCostUsd,
    pk: o.pk,
    label: `${template.threat_platform_id} vs ${o.defeat_system_name}`,
  }))

  const top = options[0]
  const salvoNote = top
    ? `Top option magazine ${top.magazine_rounds} rounds, reload ${top.reload_min} min — run salvo sim before fielding decision.`
    : 'No economics rows matched threat — verify engagement_economics seed.'

  return {
    threat_platform_id: template.threat_platform_id,
    economics_rows: economicsRows.filter((r) => r.platformId === template.threat_platform_id),
    panel_rows: panelRows.length ? panelRows : [],
    recommended_option_id: top?.defeat_system_id ?? '',
    salvo_note: salvoNote,
  }
}

export function buildAcquireSessionFromData(
  template: AcquireTemplate,
  inputs: AcquireSessionInputs,
): AcquireSession {
  const threatName = inputs.threatName ?? 'Shahed-136'

  const gap = analyzeGap(
    template,
    inputs.darwinOrbat,
    inputs.defeatCoverage,
    threatName,
  )

  const options = rankAcquireOptions(
    template.threat_platform_id,
    inputs.defeatCoverage,
    inputs.economicsRows,
    3,
  )

  const calc = buildCalc(template, options, inputs.economicsRows)
  const brief = buildAcquisitionBrief(template, gap, options, calc)

  return { template, gap, options, calc, brief, defeatCoverage: inputs.defeatCoverage }
}
