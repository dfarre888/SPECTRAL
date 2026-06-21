import { describe, expect, it } from 'vitest'
import {
  mergeAccreditedOverOsint,
  OFFLINE_ACCREDITED_DEFEAT_PK,
  OFFLINE_ACCREDITED_ERP,
  OFFLINE_ACCREDITED_WAVEFORMS,
  resolveAccreditedErpForJam,
} from '@/lib/operations/accredited-supplements'
import type { DefeatEffectiveness } from '@/lib/types'

describe('accredited training supplements', () => {
  it('offline waveforms are training_contract_analogue with caveats', () => {
    expect(OFFLINE_ACCREDITED_WAVEFORMS.length).toBe(4)
    for (const row of OFFLINE_ACCREDITED_WAVEFORMS) {
      expect(row.data_provenance).toBe('training_contract_analogue')
      expect(row.caveat).toMatch(/NOT classified/i)
    }
  })

  it('offline ERP profiles include Edge Horizon jam bands', () => {
    expect(OFFLINE_ACCREDITED_ERP.length).toBe(4)
    const jamControl = resolveAccreditedErpForJam('edge-horizon', 'jam_control')
    expect(jamControl?.erp_dbm).toBe(47)
    expect(jamControl?.source).toContain('training_contract_analogue')
  })

  it('offline defeat Pk covers shahed and fibre FPV pairs', () => {
    expect(OFFLINE_ACCREDITED_DEFEAT_PK.length).toBe(8)
    const fpvImmune = OFFLINE_ACCREDITED_DEFEAT_PK.find(
      (r) => r.platform_id === 'fpv-fibre-optic' && r.defeat_system_id === 'edge-horizon',
    )
    expect(fpvImmune?.is_immune).toBe(true)
    expect(fpvImmune?.pk_rf_jamming_pct).toBe(0)
  })

  it('mergeAccreditedOverOsint prefers accredited Pd/Pk over OSINT', () => {
    const osint: DefeatEffectiveness = {
      id: 'osint',
      platform_id: 'shahed-136',
      defeat_system_id: 'edge-horizon',
      rf_jamming_pct: 40,
      kinetic_pct: null,
      dew_pct: null,
      data_confidence: 'estimated',
      is_immune: false,
      immune_reason: null,
      swarm_engagement_pct: 30,
      weather_limited: false,
      special_notes: null,
      adjudication_rationale: null,
      modifiers: [],
      recommended_response: null,
    }
    const accredited = OFFLINE_ACCREDITED_DEFEAT_PK.find(
      (r) => r.platform_id === 'shahed-136' && r.defeat_system_id === 'edge-horizon',
    )!
    const merged = mergeAccreditedOverOsint(osint, accredited)
    expect(merged?.rf_jamming_pct).toBe(74)
    expect(merged?.swarm_engagement_pct).toBe(61)
    expect(merged?.special_notes).toMatch(/NOT classified Edge Group/i)
  })
})
