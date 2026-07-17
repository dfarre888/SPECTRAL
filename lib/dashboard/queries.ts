import 'server-only'

import { fetchProposedCurrencyCount } from '@/lib/currency/currency-queries'
import { isOperationsEdition } from '@/lib/operations/edition'
import { listImportJobs, type ImportJob } from '@/lib/operations/import'
import { requireTenantContext } from '@/lib/operations/tenant'
import { listPlans } from '@/lib/planner/plan-store'
import type { BattlespacePlanRow } from '@/lib/planner/battlespace-plan'
import { listScenarios } from '@/lib/wopr/store'
import type { WoprScenario } from '@/lib/wopr/types'

export interface DashboardLiveSnapshot {
  plans: BattlespacePlanRow[]
  woprScenarios: WoprScenario[]
  importJobs: ImportJob[]
  pendingCurrency: number
  recentPlan: BattlespacePlanRow | null
}

export async function fetchDashboardLiveData(): Promise<DashboardLiveSnapshot> {
  let pendingCurrency = 0
  try {
    pendingCurrency = await fetchProposedCurrencyCount()
  } catch {
    pendingCurrency = 0
  }

  const empty: DashboardLiveSnapshot = {
    plans: [],
    woprScenarios: [],
    importJobs: [],
    pendingCurrency,
    recentPlan: null,
  }

  try {
    const ctx = await requireTenantContext()
    if (!ctx.userId && !isOperationsEdition()) return empty

    let plans: BattlespacePlanRow[] = []
    if (ctx.userId) {
      plans = await listPlans(ctx.userId, isOperationsEdition() ? ctx.tenantId : null)
    }

    let woprScenarios: WoprScenario[] = []
    let importJobs: ImportJob[] = []
    if (isOperationsEdition()) {
      woprScenarios = await listScenarios(ctx.tenantId)
      importJobs = await listImportJobs(ctx.tenantId)
    }

    const recentPlan =
      plans.find((p) => countLaydownAssets(p) > 0) ?? plans[0] ?? null

    return {
      plans,
      woprScenarios,
      importJobs,
      pendingCurrency,
      recentPlan,
    }
  } catch {
    return empty
  }
}

function countLaydownAssets(plan: BattlespacePlanRow): number {
  const l = plan.laydown
  return l.uas.length + l.cuas.length + l.radars.length + l.effectors.length
}
