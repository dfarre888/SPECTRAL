import { NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/operations/audit'
import { requireTenantContext } from '@/lib/operations/tenant'
import { evaluateConsentStatus, getActiveConsent, grantConsent } from '@/lib/iep/consent'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { participantId: string } },
) {
  try {
    const ctx = await requireTenantContext()
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    const record = await getActiveConsent(params.participantId)
    const status = evaluateConsentStatus(record)
    return NextResponse.json({ data: status })
  } catch (err) {
    console.error('[GET consent]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { participantId: string } },
) {
  try {
    const ctx = await requireTenantContext()
    if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = (await request.json()) as {
      parentCarerName?: string
      parentCarerRelationship?: string
      under15AssentConfirmed?: boolean
    }
    if (!body.parentCarerName?.trim()) {
      return NextResponse.json({ error: 'parentCarerName required' }, { status: 400 })
    }

    const record = await grantConsent({
      participantId: params.participantId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      parentCarerName: body.parentCarerName.trim(),
      parentCarerRelationship: body.parentCarerRelationship,
      under15AssentConfirmed: body.under15AssentConfirmed,
    })

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'iep.consent.grant',
      resourceType: 'participant_consent',
      resourceId: record.id,
      classification: ctx.classification,
    })

    return NextResponse.json({ data: record })
  } catch (err) {
    console.error('[POST consent]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
