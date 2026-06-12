import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { roleCanImportPlatforms } from '@/lib/operations/auth-config'
import { createImportJob } from '@/lib/operations/import'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!roleCanImportPlatforms(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden — analyst or admin required' }, { status: 403 })
  }

  const body = (await request.json()) as {
    name?: string
    manufacturer?: string
    category?: string
    capabilities?: unknown[]
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const job = await createImportJob(ctx.tenantId, ctx.userId, 'platform', {
    name: body.name.trim(),
    manufacturer: body.manufacturer ?? 'Proprietary',
    category: body.category ?? 'uas',
    capabilities: body.capabilities ?? [],
    source: 'customer_proprietary',
    confidence: 'Reported',
  })

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'import.platform.queued',
    resourceType: 'import_job',
    resourceId: job.id,
    classification: ctx.classification,
  })

  return NextResponse.json({ data: job, classification: ctx.classification })
}
