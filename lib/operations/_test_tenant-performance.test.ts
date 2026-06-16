import { describe, expect, it } from 'vitest'
import {
  CATALOGUE_DATA_GAPS,
  mergeTenantOverOsint,
  type TenantDefeatEffectivenessRow,
} from '@/lib/operations/tenant-performance'
import type { DefeatEffectiveness } from '@/lib/types'

const GAP_IDS = [
  'edge-horizon-waveform-classified',
  'edge-horizon-erp-accredited',
  'mod-verified-pk-tier',
]

describe('tenant performance placeholders', () => {
  it('catalogue_data_gaps seed covers three contract-gated slots', () => {
    expect(CATALOGUE_DATA_GAPS.map((g) => g.id)).toEqual(GAP_IDS)
    expect(CATALOGUE_DATA_GAPS.find((g) => g.id === 'mod-verified-pk-tier')?.resolution_path).toBe(
      'tenant_defeat_effectiveness',
    )
    expect(
      CATALOGUE_DATA_GAPS.find((g) => g.id === 'edge-horizon-waveform-classified')?.resolution_path,
    ).toBe('accredited_resolver')
    expect(
      CATALOGUE_DATA_GAPS.find((g) => g.id === 'edge-horizon-erp-accredited')?.resolution_path,
    ).toBe('tenant_defeat_effectiveness')
  })

  it('mergeTenantOverOsint prefers tenant Pk/Pd over OSINT row', () => {
    const osint: DefeatEffectiveness = {
      id: 'osint-1',
      platform_id: 'shahed-136',
      defeat_system_id: 'edge-horizon',
      rf_jamming_pct: 40,
      kinetic_pct: null,
      dew_pct: null,
      data_confidence: 'estimated',
      is_immune: false,
      immune_reason: null,
      adjudication_rationale: null,
      modifiers: [],
      recommended_response: null,
      weather_limited: false,
      swarm_engagement_pct: 30,
      special_notes: null,
    }

    const tenant: TenantDefeatEffectivenessRow = {
      id: 'tenant-1',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      platform_id: 'shahed-136',
      defeat_system_id: 'edge-horizon',
      rf_jamming_pct: 82,
      kinetic_pct: null,
      dew_pct: null,
      pd_detect_pct: 91,
      data_provenance: 'mod_verified',
      confidence: 'Confirmed',
      classification: 'UNCLASSIFIED',
      source_notes: 'MoD accredited Pk tier',
      approved_by: null,
      created_by: '00000000-0000-0000-0000-000000000002',
      created_at: '2026-06-16T12:00:00.000Z',
    }

    const merged = mergeTenantOverOsint(osint, tenant)
    expect(merged?.rf_jamming_pct).toBe(82)
    expect(merged?.swarm_engagement_pct).toBe(91)
    expect(merged?.data_confidence).toBe('high')
  })

  it('mergeTenantOverOsint creates tenant-only row when OSINT absent', () => {
    const tenant: TenantDefeatEffectivenessRow = {
      id: 'tenant-only',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      platform_id: 'custom-uas',
      defeat_system_id: 'edge-horizon',
      rf_jamming_pct: 55,
      kinetic_pct: 70,
      dew_pct: null,
      pd_detect_pct: 88,
      data_provenance: 'customer_proprietary',
      confidence: 'Reported',
      classification: 'UNCLASSIFIED',
      source_notes: null,
      approved_by: null,
      created_by: '00000000-0000-0000-0000-000000000002',
      created_at: '2026-06-16T12:00:00.000Z',
    }

    const merged = mergeTenantOverOsint(undefined, tenant)
    expect(merged?.platform_id).toBe('custom-uas')
    expect(merged?.kinetic_pct).toBe(70)
  })
})
