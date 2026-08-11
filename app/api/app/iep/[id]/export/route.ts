import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { buildIepDocx } from '@/lib/iep/export/docx-template'
import { getIepPlan } from '@/lib/iep/plan-store'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireTenantContext()
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const plan = await getIepPlan(params.id)
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const buffer = await buildIepDocx(plan)
    const filename = `${plan.document_title.replace(/\s+/g, '_')}_${plan.school_year}.docx`

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'iep.export',
      resourceType: 'iep_plan',
      resourceId: params.id,
      classification: ctx.classification,
      metadata: { format: 'docx' },
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[POST /api/app/iep/[id]/export]', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
