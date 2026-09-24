import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { buildPayload, type EvidenceInput } from '@/lib/base-protection/evidence'
import { appendEvidence, EvidenceConflictError, getEvidenceChain } from '@/lib/base-protection/queries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Every version of one record, oldest first, each re-verified. */
export async function GET(request: Request, { params }: { params: { recordId: string } }) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!UUID_RE.test(params.recordId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const { versions, storage } = await getEvidenceChain(ctx.tenantId, params.recordId)
    if (versions.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: versions, storage, classification: ctx.classification })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load' }, { status: 500 })
  }
}

/** Amend: append a new version that references the previous hash. Nothing is overwritten. */
export async function POST(request: Request, { params }: { params: { recordId: string } }) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!UUID_RE.test(params.recordId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let input: EvidenceInput
  try {
    input = (await request.json()) as EvidenceInput
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }
  const built = buildPayload(input, { requireAmendmentReason: true })
  if (!built.ok) return NextResponse.json({ error: 'Check the highlighted fields', fields: built.errors }, { status: 422 })

  try {
    const { record, storage } = await appendEvidence(ctx.tenantId, ctx.userId, built.payload, params.recordId)
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'base_protection.evidence.amend',
      resourceType: 'base_protection_evidence',
      resourceId: record.record_id,
      classification: ctx.classification,
      metadata: { version: record.version, prev_hash: record.prev_hash, record_hash: record.record_hash, storage },
    })
    return NextResponse.json({ data: record, storage, classification: ctx.classification }, { status: 201 })
  } catch (e) {
    if (e instanceof EvidenceConflictError) return NextResponse.json({ error: e.message }, { status: 409 })
    const msg = e instanceof Error ? e.message : 'Failed to save'
    return NextResponse.json({ error: msg }, { status: msg === 'Not found' ? 404 : 500 })
  }
}
