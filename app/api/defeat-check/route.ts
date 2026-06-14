import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCellValue } from '@/lib/defeat/cell-value'
import { getDefeatCheckData } from '@/lib/map/queries'
import { adjudicatePcmPair } from '@/lib/pcm/pcm-spectrum-bridge'
import type { PCM } from '@/lib/pcm/spectral.types'

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

    const cell = resolveCellValue(platform, system, effectiveness ?? undefined)

    if (cell.kind === 'immune') {
      return NextResponse.json({
        data: { effectiveness_pct: 100, is_immune: true, kind: 'immune', reason: cell.reason },
      })
    }

    if (cell.kind === 'empty') {
      // P0-D: No defeat matrix row — run PCM adjudication from platform/system OSINT specs
      // rather than fabricating a hardcoded 50%. Both assets placed at the same grid ref so
      // range = 0 km → always inRange; produces a pure spectrum × platform-class estimate.
      const cuasGroup: string = system.defeat_method.includes('RF_jamming')
        ? 'c_uas_defeat_ew'
        : system.defeat_method.some((m) => ['laser', 'directed_energy', 'EMP'].includes(m))
          ? 'c_uas_defeat_dew'
          : 'c_uas_defeat_kinetic'

      const threatPcm = {
        id: platform.id,
        type: platform.name.toLowerCase().replace(/[\s_]+/g, '-'),
        group: 'OWA',
        quantity: 1,
        quantity_remaining: 1,
        range_km: platform.range_km ?? 50,
        altitude_m: platform.service_ceiling_m ?? 200,
        location_grid: 'ECHO-7',
        status: 'airborne_tasked',
        fuel_state_percent: 80,
        payload: 'unknown',
        guidance: 'GNSS_INS',
        ew_immune: false,
        rcs_class: 'low',
        speed_kt: 100,
        ceiling_ft: 10000,
        endurance_hr: 5,
      } as PCM.Platform

      const defenderPcm = {
        id: system.id,
        type: system.name.toLowerCase().replace(/[\s_]+/g, '-'),
        group: cuasGroup,
        range_km: system.effective_range_m / 1000,
        location_grid: 'ECHO-7', // same grid → range = 0 km → always inRange
        status: 'ground_ready',
      } as PCM.Platform

      const adj = adjudicatePcmPair(threatPcm, defenderPcm, null)
      return NextResponse.json({
        data: {
          effectiveness_pct: adj.combinedBlueSuccessPct,
          is_immune: false,
          kind: 'adjudicated',
          spectrum_verdict: adj.spectrumVerdict,
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
