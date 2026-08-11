import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { getIepPlan, updateIepPlan } from '@/lib/iep/plan-store'
import type { UpdateIepInput } from '@/lib/iep/plan-store'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenantContext()
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    const plan = await getIepPlan(params.id)
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: plan })
  } catch (err) {
    console.error('[GET /api/app/iep/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as UpdateIepInput
    const updated = await updateIepPlan(params.id, body)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'iep.update',
      resourceType: 'iep_plan',
      resourceId: params.id,
      classification: ctx.classification,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    console.error('[PUT /api/app/iep/[id]]', err)
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
