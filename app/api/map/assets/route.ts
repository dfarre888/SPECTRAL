import { NextResponse } from 'next/server'
import { getMapAssets } from '@/lib/map/queries'

export async function GET() {
  try {
    const data = await getMapAssets()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/map/assets]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
