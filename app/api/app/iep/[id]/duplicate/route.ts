import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { duplicateIepAsDraft } from '@/lib/iep/plan-store'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenantContext(request)
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as { schoolYear?: number }
    const duplicated = await duplicateIepAsDraft(params.id, ctx.userId, body.schoolYear)

    if (!duplicated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'iep.duplicate',
      resourceType: 'iep_plan',
      resourceId: duplicated.id,
      classification: ctx.classification,
      metadata: { supersedesId: params.id },
    })

    return NextResponse.json({ data: duplicated })
  } catch (err) {
    console.error('[POST /api/app/iep/[id]/duplicate]', err)
    return NextResponse.json({ error: 'Duplicate failed' }, { status: 500 })
  }
}
