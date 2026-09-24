import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { BranchError } from '@/lib/wopr/branch'
import { branchScenario } from '@/lib/wopr/store'

export const dynamic = 'force-dynamic'

/**
 * Fork a scenario at a recorded turn. Body: `{ "turn": number }` (0 forks the
 * initial laydown). The new scenario carries the history up to that turn.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let turn: number
  try {
    const body = (await request.json()) as { turn?: unknown }
    turn = Number(body.turn)
  } catch {
    return NextResponse.json({ error: 'JSON body with "turn" required' }, { status: 400 })
  }
  if (!Number.isInteger(turn) || turn < 0) {
    return NextResponse.json({ error: '"turn" must be a whole number, zero or more' }, { status: 400 })
  }

  try {
    const result = await branchScenario(ctx.tenantId, ctx.userId, params.id, turn)
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'wopr.scenario.branch',
      resourceType: 'wopr_scenario',
      resourceId: result.scenario.id,
      classification: ctx.classification,
      metadata: { parent: params.id, turn, approximate: result.plan.approximate },
    })

    return NextResponse.json({
      data: { scenario: result.scenario, ticks: result.ticks, approximate: result.plan.approximate },
      classification: ctx.classification,
    })
  } catch (err) {
    if (err instanceof BranchError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
}
