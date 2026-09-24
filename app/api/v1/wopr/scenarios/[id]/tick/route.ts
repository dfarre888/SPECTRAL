import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { isOperationsEdition } from '@/lib/operations/edition'
import { advanceScenario } from '@/lib/wopr/engine'
import { publishTick } from '@/lib/wopr/live-bus'
import { refreshScenarioPropagation } from '@/lib/wopr/propagation-refresh'
import { appendTick, getScenario, saveScenario } from '@/lib/wopr/store'

/** Propagation lines added to the event log per tick; the full set is in the cache. */
const MAX_PROPAGATION_EVENTS = 5

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const scenario = await getScenario(params.id, ctx.tenantId)
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let { scenario: updated, tick } = advanceScenario(scenario)

  if (isOperationsEdition()) {
    const { cache, events, records } = await refreshScenarioPropagation(
      updated.world_state,
      ctx.tenantId,
    )
    updated = {
      ...updated,
      world_state: {
        ...updated.world_state,
        propagation_cache: cache,
      },
    }
    tick = {
      ...tick,
      events: [...tick.events, ...events.slice(0, MAX_PROPAGATION_EVENTS)],
      records: [...(tick.records ?? []), ...records.slice(0, MAX_PROPAGATION_EVENTS)],
      propagation_refreshed: true,
      propagation_cache: cache,
    }
  }

  await saveScenario(updated)
  await appendTick(updated, tick)
  publishTick(ctx.tenantId, params.id, tick)

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'wopr.scenario.tick',
    resourceType: 'wopr_scenario',
    resourceId: params.id,
    classification: ctx.classification,
    metadata: { turn: tick.turn },
  })

  return NextResponse.json({ data: { scenario: updated, tick }, classification: ctx.classification })
}
