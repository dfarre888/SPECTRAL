import 'server-only'

import { toCommsFits } from '@/data/seed-bmi-pitchblack2026'
import { fetchBmiExercise } from '@/lib/bmi/bmi-queries'
import type { PlatformCommsFit } from '@/lib/bmi/bmi-types'
import { pacePlanner } from '@/lib/bmi/pacePlanner'
import { assessGoNoGo, type GoNoGoInput } from '@/lib/command/go-no-go-engine'
import type { CommandPlanOption, GoNoGoAssessment } from '@/lib/command/go-no-go-types'
import { fetchGnssJammingIncidents } from '@/lib/gnss/gnss-queries'
import { authorizeDsRoute, resolveSessionDsPlayerId } from '@/lib/moat/ds-route-auth'
import { isOperationsEdition } from '@/lib/operations/edition'
import {
  computeExchangeRatio,
  OSINT_THREAT_COSTS_USD,
  type EconomicsRow,
} from '@/lib/planner/engagement-economics'
import { ensurePlanDocumentV2, type BattlespacePlanRow } from '@/lib/planner/battlespace-plan'
import { getPlan, listPlans } from '@/lib/planner/plan-store'
import { createClient } from '@/lib/supabase/server'

export interface CommandBoardOptions {
  userId: string
  tenantId?: string | null
  planId?: string | null
  dsPlayerId?: string | null
}

/** Thrown when plan_id is supplied but not readable in the caller tenant scope. */
export class CommandPlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`)
    this.name = 'CommandPlanNotFoundError'
  }
}

function resolvePrimaryBearer(
  pacePrimaryLabel: string | undefined,
  fits: PlatformCommsFit[],
): GoNoGoInput['package']['primary_bearer'] {
  if (!pacePrimaryLabel) return null
  const bearers = fits.flatMap((f) => f.bearers)
  const match =
    bearers.find((b) => b.label === pacePrimaryLabel) ??
    bearers.find((b) => pacePrimaryLabel.includes(b.label)) ??
    null
  if (!match) {
    return {
      standard: /link\s*16/i.test(pacePrimaryLabel) ? 'link16' : null,
      pnt_dependent: /link\s*16/i.test(pacePrimaryLabel),
      label: pacePrimaryLabel,
    }
  }
  return {
    standard: match.standard ?? null,
    pnt_dependent: match.pnt_dependent,
    label: match.label,
  }
}

function buildFitsFromExercise(platformIds: string[] | null): PlatformCommsFit[] {
  const all = toCommsFits()
  if (!platformIds?.length) return all.slice(0, 6)
  const filtered = all.filter((f) => platformIds.includes(f.platform_id))
  return filtered.length >= 2 ? filtered : all.slice(0, 6)
}

async function loadEconomicsMagDepth(
  plan: BattlespacePlanRow | null,
  readinessMag: number | null,
): Promise<{ mag_depth: number | null; exchange_caution: boolean }> {
  let magDepth = readinessMag
  let exchangeCaution = false

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('engagement_economics')
      .select('platform_id, defeat_system_id, magazine_rounds, unit_cost_usd, threat_unit_cost_usd, pk')
      .limit(50)

    if (!error && data?.length) {
      const magazines = data
        .map((row) => (typeof row.magazine_rounds === 'number' ? row.magazine_rounds : null))
        .filter((v): v is number => v !== null)
      if (magazines.length) {
        magDepth = magDepth ?? Math.min(...magazines)
      }

      for (const row of data) {
        const threatCost =
          typeof row.threat_unit_cost_usd === 'number'
            ? row.threat_unit_cost_usd
            : OSINT_THREAT_COSTS_USD[row.platform_id as string] ?? 20_000
        const effectorCost = typeof row.unit_cost_usd === 'number' ? row.unit_cost_usd : 1_000_000
        const pk = typeof row.pk === 'number' ? row.pk : 0.75
        const ratio = computeExchangeRatio(threatCost, effectorCost, pk)
        if (ratio.exchangeRatio > 10) {
          exchangeCaution = true
          break
        }
      }
      return { mag_depth: magDepth, exchange_caution: exchangeCaution }
    }
  } catch {
    // fall through to OSINT defaults
  }

  const osintRows: EconomicsRow[] = plan?.economics_scenarios?.length
    ? plan.economics_scenarios.map((s) => ({
        platformId: s.platformId,
        defeatSystemId: s.defeatSystemId,
        unitCostUsd: 1_000_000,
        threatUnitCostUsd: OSINT_THREAT_COSTS_USD[s.platformId] ?? 20_000,
        magazineRounds: 4,
        reloadMin: 30,
        costConfidence: 'Estimated',
        sourceRef: 'OSINT baseline',
      }))
    : [
        {
          platformId: 'shahed-136',
          defeatSystemId: 'nasams-amraam-er',
          unitCostUsd: 1_000_000,
          threatUnitCostUsd: 20_000,
          magazineRounds: 4,
          reloadMin: 30,
          costConfidence: 'Estimated',
          sourceRef: 'OSINT baseline',
        },
      ]

  if (magDepth === null) {
    magDepth = Math.min(...osintRows.map((r) => r.magazineRounds))
  }

  for (const row of osintRows) {
    const ratio = computeExchangeRatio(row.threatUnitCostUsd, row.unitCostUsd, 0.75)
    if (ratio.exchangeRatio > 10) exchangeCaution = true
  }

  return { mag_depth: magDepth, exchange_caution: exchangeCaution }
}

async function loadCompetencyTile(
  plan: BattlespacePlanRow | null,
  userId: string,
  dsPlayerId?: string | null,
): Promise<GoNoGoInput['competency']> {
  try {
    const supabase = await createClient()
    const sessionDsId = await resolveSessionDsPlayerId(supabase, userId)
    const effectiveDsId = dsPlayerId ?? sessionDsId
    if (!effectiveDsId) {
      return { available: false, currency_ok: null, summary: 'DS view required' }
    }

    const authErr = await authorizeDsRoute(supabase, userId, effectiveDsId)
    if (authErr) {
      return { available: false, currency_ok: null, summary: 'DS view required' }
    }

    const refs = plan
      ? (ensurePlanDocumentV2(plan.laydown).readiness?.crew_currency_refs ?? [])
      : []
    const currencyOk = refs.length > 0
    return {
      available: true,
      currency_ok: currencyOk,
      summary: currencyOk
        ? `${refs.length} crew currency ref(s) on plan`
        : 'No crew currency refs linked — review before launch',
    }
  } catch {
    return { available: false, currency_ok: null, summary: 'DS view required' }
  }
}

export async function fetchCommandPlans(
  userId: string,
  tenantId?: string | null,
): Promise<CommandPlanOption[]> {
  try {
    const plans = await listPlans(userId, isOperationsEdition() ? tenantId : null)
    return plans.map((p) => ({ id: p.id, name: p.name, updated_at: p.updated_at }))
  } catch {
    return []
  }
}


function deriveBlockingIssues(
  laydown: ReturnType<typeof ensurePlanDocumentV2> | null,
  magDepth: number | null,
): string[] {
  const issues: string[] = []
  const blocking = laydown?.readiness?.blocking_issues ?? []
  for (const issue of blocking) {
    issues.push(typeof issue === 'string' ? issue : issue.message)
  }
  if (magDepth === 0) issues.push('Magazine depth is zero — no effectors available')
  return issues
}

function deriveAirspaceConflicts(
  laydown: ReturnType<typeof ensurePlanDocumentV2> | null,
): string[] {
  if (!laydown) return []
  const extended = laydown.airspace as { conflicts?: string[] } | undefined
  if (extended?.conflicts?.length) return [...extended.conflicts]
  // Structural check: ROZ with fewer than 3 vertices is invalid
  const roz = laydown.airspace?.roz ?? []
  const bad = roz.filter((r) => {
    const ring = (r as { ring?: unknown[] }).ring ?? (Array.isArray(r) ? r : null)
    return Array.isArray(ring) && ring.length > 0 && ring.length < 3
  })
  if (bad.length) return [`${bad.length} ROZ polygon(s) have invalid geometry`]
  return []
}

export async function buildCommandAssessment(
  options: CommandBoardOptions,
): Promise<GoNoGoAssessment> {
  const { userId, tenantId, planId, dsPlayerId } = options

  let plan: BattlespacePlanRow | null = null
  if (planId) {
    // Tenant-scoped access — matches plan SSE / updatePlan authz (no silent OSINT fallback)
    plan = await getPlan(planId, userId, tenantId)
    if (!plan) throw new CommandPlanNotFoundError(planId)
  }

  const laydown = plan ? ensurePlanDocumentV2(plan.laydown) : null
  const exerciseId = laydown?.coalition?.exercise_id ?? undefined
  const exercise = await fetchBmiExercise(exerciseId ?? 'PITCH_BLACK_2026')

  const platformIds =
    laydown?.coalition?.bmi_platform_ids?.length
      ? laydown.coalition.bmi_platform_ids
      : (laydown?.red_force?.platforms.map((p) => p.id) ?? null)
  const fits = buildFitsFromExercise(platformIds)
  const { plan: pacePlan } = pacePlanner.buildPackagePace(fits)
  const primaryEntry = pacePlan.entries.find((e) => e.tier === 'primary')
  const primaryBearer = resolvePrimaryBearer(primaryEntry?.bearer_label, fits)

  const incidents = await fetchGnssJammingIncidents()
  const confirmed = incidents.filter((i) => i.confirmed)
  const jamActive = confirmed.length > 0
  const affectedConstellations = [
    ...new Set(confirmed.flatMap((i) => i.affected_constellations ?? [])),
  ]

  const magOverrides = laydown?.readiness?.mag_depth_overrides ?? {}
  const readinessMag =
    typeof magOverrides['*'] === 'number'
      ? magOverrides['*']
      : (Object.values(magOverrides)[0] ?? null)
  const economics = await loadEconomicsMagDepth(plan, readinessMag)

  const competency = await loadCompetencyTile(plan, userId, dsPlayerId)

  const packageLabel = plan?.name ?? exercise.meta.name ?? 'Coalition air package'
  const packageId = plan?.id ?? exercise.meta.id ?? 'seed-default'

  const input: GoNoGoInput = {
    plan_id: plan?.id ?? null,
    package: {
      id: packageId,
      label: packageLabel,
      primary_bearer: primaryBearer,
      pace_complete: pacePlan.complete,
      pace_warnings: pacePlan.warnings,
    },
    gnss: {
      jam_active: jamActive,
      affected_constellations: affectedConstellations,
    },
    readiness: {
      // Do not invent degraded pnt_status from jam — LINK16_PNT_JAM rule covers that
      pnt_status: laydown?.readiness?.pnt_scenario_id ?? null,
      mag_depth: readinessMag,
      blocking_issues: deriveBlockingIssues(laydown, readinessMag),
    },
    airspace: {
      roz: laydown?.airspace.roz ?? [],
      conflicts: deriveAirspaceConflicts(laydown),
    },
    economics,
    weather: {
      available: false,
      adverse: false,
      summary: 'Manual refresh / Map Intel wind',
    },
    competency,
  }

  return assessGoNoGo(input)
}
