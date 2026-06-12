import { NextResponse } from 'next/server'
import { resolveCellValue } from '@/lib/defeat/cell-value'
import { getDefeatCheckData } from '@/lib/map/queries'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const uasId = searchParams.get('uas_id')
    const cuasId = searchParams.get('cuas_id')

    if (!uasId || !cuasId) {
      return NextResponse.json({ error: 'uas_id and cuas_id required' }, { status: 400 })
    }

    const { platform, system, effectiveness } = await getDefeatCheckData(uasId, cuasId)

    if (!platform || !system) {
      return NextResponse.json({
        data: { effectiveness_pct: null, is_immune: false, kind: 'empty' },
      })
    }

    const cell = resolveCellValue(platform, system, effectiveness ?? undefined)

    if (cell.kind === 'immune') {
      return NextResponse.json({
        data: { effectiveness_pct: 100, is_immune: true, kind: 'immune', reason: cell.reason },
      })
    }

    if (cell.kind === 'empty') {
      return NextResponse.json({
        data: { effectiveness_pct: 50, is_immune: false, kind: 'estimated' },
      })
    }

    return NextResponse.json({
      data: {
        effectiveness_pct: cell.value,
        is_immune: false,
        kind: 'pct',
      },
    })
  } catch (error) {
    console.error('[GET /api/defeat-check]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
