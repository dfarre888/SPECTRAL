import { NextResponse } from 'next/server'
import { isOperationsEdition } from '@/lib/operations/edition'
import { listCatalogueDataGaps } from '@/lib/operations/tenant-performance'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function GET(request: Request) {
  if (!isOperationsEdition()) {
    return NextResponse.json({ error: 'Operations edition required' }, { status: 403 })
  }

  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const data = await listCatalogueDataGaps()
  return NextResponse.json({ data, classification: ctx.classification })
}
