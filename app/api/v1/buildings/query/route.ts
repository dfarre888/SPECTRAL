import { NextResponse } from 'next/server'
import { requireTenantContext } from '@/lib/operations/tenant'
import { BuildingSpatialIndex } from '@/lib/buildings/spatial-index'
import { loadBuildingsForTenant } from '@/lib/buildings/store'

export async function GET(request: Request) {
  const ctx = await requireTenantContext(request)
  const { searchParams } = new URL(request.url)
  const south = parseFloat(searchParams.get('south') ?? '0')
  const west = parseFloat(searchParams.get('west') ?? '0')
  const north = parseFloat(searchParams.get('north') ?? '0')
  const east = parseFloat(searchParams.get('east') ?? '0')

  const buildings = await loadBuildingsForTenant(ctx.tenantId)
  const index = new BuildingSpatialIndex(buildings, ctx.tenantId)
  const hits = index.queryBounds(south, west, north, east)

  return NextResponse.json({ data: hits, count: hits.length })
}
