import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { bannerForClassification } from '@/lib/operations/classification'
import { requireTenantContext } from '@/lib/operations/tenant'
import { EVIDENCE_SCHEMA, LEGAL_NOTE } from '@/lib/base-protection/evidence'
import { getEvidenceChain } from '@/lib/base-protection/queries'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Police hand-over package as a JSON download: every version with its hash
 * and the method needed to re-derive it independently.
 */
export async function GET(request: Request, { params }: { params: { recordId: string } }) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!UUID_RE.test(params.recordId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const { versions } = await getEvidenceChain(ctx.tenantId, params.recordId)
    if (versions.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const latest = versions[versions.length - 1]
    const exportedAt = new Date().toISOString()
    const body = {
      classification: bannerForClassification(ctx.classification),
      schema: EVIDENCE_SCHEMA,
      note: LEGAL_NOTE,
      exercise_record: latest.is_exercise,
      exported_at: exportedAt,
      integrity: {
        algorithm: 'SHA-384',
        hashed_fields: ['record_id', 'version', 'prev_hash', 'created_at', 'payload'],
        canonical_form: 'JSON with object keys sorted by code point at every depth, no whitespace, UTF-8',
        chain: 'Each version after the first carries prev_hash equal to the previous version record_hash.',
        all_versions_verified: versions.every((v) => v.integrity === 'verified'),
      },
      record_id: latest.record_id,
      latest_version: latest.version,
      versions: versions.map((v) => ({
        version: v.version,
        created_at: v.created_at,
        prev_hash: v.prev_hash,
        record_hash: v.record_hash,
        integrity: v.integrity,
        payload: v.payload,
      })),
    }
    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'base_protection.evidence.export',
      resourceType: 'base_protection_evidence',
      resourceId: latest.record_id,
      classification: ctx.classification,
      metadata: { latest_version: latest.version, record_hash: latest.record_hash },
    })
    const name = `counter-uxs-${latest.site_id}-${latest.payload.occurred.utc.slice(0, 10)}-v${latest.version}.json`
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Export failed' }, { status: 500 })
  }
}
