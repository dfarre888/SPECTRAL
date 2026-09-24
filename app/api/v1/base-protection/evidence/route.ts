import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { buildPayload, LEGAL_NOTE, type EvidenceInput } from '@/lib/base-protection/evidence'
import { appendEvidence, listEvidence } from '@/lib/base-protection/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const { records, storage } = await listEvidence(ctx.tenantId)
    return NextResponse.json({ data: records, storage, note: LEGAL_NOTE, classification: ctx.classification })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load the evidence log' }, { status: 500 })
  }
}

/** Append a new incident record (version 1). The server hashes it. */
export async function POST(request: Request) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let input: EvidenceInput
  try {
    input = (await request.json()) as EvidenceInput
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }
  const built = buildPayload(input)
  if (!built.ok) return NextResponse.json({ error: 'Check the highlighted fields', fields: built.errors }, { status: 422 })

  try {
    const { record, storage } = await appendEvidence(ctx.tenantId, ctx.userId, built.payload)
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'base_protection.evidence.append',
      resourceType: 'base_protection_evidence',
      resourceId: record.record_id,
      classification: ctx.classification,
      metadata: { version: record.version, record_hash: record.record_hash, storage },
    })
    return NextResponse.json({ data: record, storage, classification: ctx.classification }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to save' }, { status: 500 })
  }
}
