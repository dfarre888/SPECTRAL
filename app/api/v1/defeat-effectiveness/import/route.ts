import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { roleCanImportPlatforms } from '@/lib/operations/auth-config'
import { isOperationsEdition } from '@/lib/operations/edition'
import { createImportJob } from '@/lib/operations/import'
import { requireTenantContext } from '@/lib/operations/tenant'

const CONFIDENCE_VALUES = ['Confirmed', 'Assessed', 'Estimated', 'Reported', 'Suspected'] as const

function parsePct(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isInteger(n) || n < 0 || n > 100) return null
  return n
}

export async function POST(request: Request) {
  if (!isOperationsEdition()) {
    return NextResponse.json({ error: 'Operations edition required' }, { status: 403 })
  }

  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!roleCanImportPlatforms(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden — analyst or admin required' }, { status: 403 })
  }

  const body = (await request.json()) as {
    platform_id?: string
    defeat_system_id?: string
    pd_detect_pct?: number | null
    rf_jamming_pct?: number | null
    kinetic_pct?: number | null
    dew_pct?: number | null
    confidence?: string
    source_notes?: string | null
    data_provenance?: string
    classification?: string
  }

  if (!body.platform_id?.trim() || !body.defeat_system_id?.trim()) {
    return NextResponse.json({ error: 'platform_id and defeat_system_id required' }, { status: 400 })
  }

  const confidence = body.confidence ?? 'Reported'
  if (!CONFIDENCE_VALUES.includes(confidence as (typeof CONFIDENCE_VALUES)[number])) {
    return NextResponse.json({ error: 'invalid confidence' }, { status: 400 })
  }

  const payload = {
    platform_id: body.platform_id.trim(),
    defeat_system_id: body.defeat_system_id.trim(),
    pd_detect_pct: parsePct(body.pd_detect_pct),
    rf_jamming_pct: parsePct(body.rf_jamming_pct),
    kinetic_pct: parsePct(body.kinetic_pct),
    dew_pct: parsePct(body.dew_pct),
    confidence,
    source_notes: body.source_notes?.trim() ?? null,
    data_provenance: body.data_provenance ?? 'customer_proprietary',
    classification: body.classification ?? ctx.classification,
  }

  const job = await createImportJob(ctx.tenantId, ctx.userId, 'defeat_matrix', payload)

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'import.defeat_matrix.queued',
    resourceType: 'import_job',
    resourceId: job.id,
    classification: ctx.classification,
    metadata: {
      platform_id: payload.platform_id,
      defeat_system_id: payload.defeat_system_id,
    },
  })

  return NextResponse.json({ data: job, classification: ctx.classification })
}
