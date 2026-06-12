import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { advanceScenario } from '@/lib/wopr/engine'
import { publishTick } from '@/lib/wopr/live-bus'
import { getScenario, saveScenario } from '@/lib/wopr/store'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const scenario = await getScenario(params.id, ctx.tenantId)
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { scenario: updated, tick } = advanceScenario(scenario)
  await saveScenario(updated)
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
