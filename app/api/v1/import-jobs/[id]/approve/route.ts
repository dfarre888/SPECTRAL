import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { approveImportJob } from '@/lib/operations/import'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const job = await approveImportJob(params.id, ctx.tenantId, ctx.userId, ctx.role)

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'import.approve',
      resourceType: 'import_job',
      resourceId: params.id,
      classification: ctx.classification,
    })

    return NextResponse.json({ data: job, classification: ctx.classification })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed'
    const status = msg === 'Forbidden' ? 403 : msg === 'Not found' ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
