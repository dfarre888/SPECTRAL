import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { roleCanImportPlatforms } from '@/lib/operations/auth-config'
import { createImportJob } from '@/lib/operations/import'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!roleCanImportPlatforms(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json()) as {
    title?: string
    mime_type?: string
    storage_path?: string
    classification?: string
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const job = await createImportJob(ctx.tenantId, ctx.userId, 'document', {
    title: body.title.trim(),
    mime_type: body.mime_type ?? 'application/pdf',
    storage_path: body.storage_path ?? `/tenant/${ctx.tenantId}/documents/pending`,
    classification: body.classification ?? ctx.classification,
  })

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'import.document.queued',
    resourceType: 'import_job',
    resourceId: job.id,
    classification: ctx.classification,
  })

  return NextResponse.json({ data: job, classification: ctx.classification })
}
