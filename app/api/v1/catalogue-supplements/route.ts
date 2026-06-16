import { NextResponse } from 'next/server'
import { isOperationsEdition } from '@/lib/operations/edition'
import {
  fetchAccreditedDefeatPk,
  fetchAccreditedErp,
  fetchAccreditedWaveforms,
  fetchAllAccreditedDefeatPk,
  OFFLINE_ACCREDITED_DEFEAT_PK,
  OFFLINE_ACCREDITED_ERP,
  OFFLINE_ACCREDITED_WAVEFORMS,
} from '@/lib/operations/accredited-supplements'
import { requireTenantContext } from '@/lib/operations/tenant'

export async function GET(request: Request) {
  if (!isOperationsEdition()) {
    return NextResponse.json({ error: 'Operations edition required' }, { status: 403 })
  }

  const ctx = await requireTenantContext(request)
  if (!ctx.userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(request.url)
  const kind = url.searchParams.get('kind')
  const systemId = url.searchParams.get('system_id') ?? undefined
  const platformId = url.searchParams.get('platform_id') ?? undefined
  const defeatSystemId = url.searchParams.get('defeat_system_id') ?? undefined

  if (kind === 'waveforms') {
    const data = await fetchAccreditedWaveforms(systemId)
    return NextResponse.json({
      data,
      classification: ctx.classification,
      provenance: 'training_contract_analogue',
      caveat: 'NOT classified vendor waveforms — training-contract analogues only.',
    })
  }

  if (kind === 'erp') {
    const data = await fetchAccreditedErp(systemId)
    return NextResponse.json({
      data,
      classification: ctx.classification,
      provenance: 'training_contract_analogue',
      caveat: 'NOT accredited propagation-engine figures — training-contract analogues only.',
    })
  }

  if (kind === 'defeat_pk') {
    if (platformId && defeatSystemId) {
      const row = await fetchAccreditedDefeatPk(platformId, defeatSystemId)
      return NextResponse.json({
        data: row ? [row] : [],
        classification: ctx.classification,
        provenance: 'training_contract_analogue',
        caveat: 'NOT MoD-verified Pk tables — training-contract analogues only.',
      })
    }
    const map = await fetchAllAccreditedDefeatPk(
      platformId ? [platformId] : ['shahed-136', 'fpv-fibre-optic'],
      defeatSystemId
        ? [defeatSystemId]
        : [
            'martlet-airborne-cuas',
            'land-ceptor-cuas',
            'edge-horizon',
            'iron-dome-tamir',
            'nasams-amraam-er',
          ],
    )
    return NextResponse.json({
      data: Array.from(map.values()),
      classification: ctx.classification,
      provenance: 'training_contract_analogue',
      caveat: 'NOT MoD-verified Pk tables — training-contract analogues only.',
    })
  }

  const [waveforms, erp, defeatPk] = await Promise.all([
    fetchAccreditedWaveforms(systemId),
    fetchAccreditedErp(systemId),
    fetchAllAccreditedDefeatPk(
      ['shahed-136', 'fpv-fibre-optic'],
      [
        'martlet-airborne-cuas',
        'land-ceptor-cuas',
        'edge-horizon',
        'iron-dome-tamir',
        'nasams-amraam-er',
      ],
    ),
  ])

  return NextResponse.json({
    waveforms,
    erp,
    defeat_pk: Array.from(defeatPk.values()),
    offline_counts: {
      waveforms: OFFLINE_ACCREDITED_WAVEFORMS.length,
      erp: OFFLINE_ACCREDITED_ERP.length,
      defeat_pk: OFFLINE_ACCREDITED_DEFEAT_PK.length,
    },
    classification: ctx.classification,
    provenance: 'training_contract_analogue',
    caveat:
      'All supplements are training-contract analogues — not classified Edge data, accredited ERP, or MoD-verified Pk.',
  })
}
