import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCellValue } from '@/lib/defeat/cell-value'
import { resolveSamKineticPct } from '@/lib/defeat/resolve-sam-pk'
import { getDefeatCheckData } from '@/lib/map/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // P0-D: auth guard — this endpoint exposes defeat intelligence data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const computedSamPk = resolveSamKineticPct(system.id, platform.id, effectiveness?.kinetic_pct ?? null)
    const cell = resolveCellValue(platform, system, effectiveness ?? undefined, 'all', null, computedSamPk)

    if (cell.kind === 'immune') {
      return NextResponse.json({
        data: { effectiveness_pct: 100, is_immune: true, kind: 'immune', reason: cell.reason },
      })
    }

    if (cell.kind === 'empty') {
      return NextResponse.json({
        data: {
          platform_id: uasId,
          system_id: cuasId,
          cell_kind: 'empty',
          effectiveness_pct: null,
          kinetic_pct: null,
          rf_jamming_pct: null,
          dew_pct: null,
          is_immune: false,
          immune_reason: null,
          swarm_engagement_pct: null,
          adjudication_rationale: null,
          kind: 'empty',
        },
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
