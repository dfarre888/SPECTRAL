import { NextResponse } from 'next/server'
import { listImportJobs } from '@/lib/operations/import'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function GET(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const data = await listImportJobs(ctx.tenantId)
  return NextResponse.json({ data, classification: ctx.classification })
}
