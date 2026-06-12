import { NextResponse } from 'next/server'
import { adjudicatePair } from '@/lib/operations/adjudication'
import { writeAuditLog } from '@/lib/operations/audit'
import { isOperationsEdition } from '@/lib/operations/edition'
import { requireTenantContext } from '@/lib/operations/tenant'
import type { LaydownPairInput } from '@/lib/operations/adjudication'

export async function POST(request: Request) {
  if (!isOperationsEdition()) {
    return NextResponse.json(
      { error: 'Operations edition required', edition: 'training', fallback: 'client_band_overlap' },
      { status: 403 },
    )
  }

  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = (await request.json()) as { pairs: LaydownPairInput[] }
  if (!body.pairs?.length) {
    return NextResponse.json({ error: 'pairs required' }, { status: 400 })
  }

  const results = await Promise.all(
    body.pairs.map((p) =>
      adjudicatePair({ ...p, tenantId: ctx.tenantId }),
    ),
  )

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'adjudication.laydown',
    resourceType: 'laydown',
    classification: ctx.classification,
    metadata: { pairs: results.length },
  })

  return NextResponse.json({ data: results, classification: ctx.classification })
}
