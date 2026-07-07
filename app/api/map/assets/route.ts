import { NextResponse } from 'next/server'
import { getMapAssets } from '@/lib/map/queries'
import { requireSpectralAuth } from '@/lib/pcm/require-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireSpectralAuth()
  if (auth.response) return auth.response

  try {
    const data = await getMapAssets()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/map/assets]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
