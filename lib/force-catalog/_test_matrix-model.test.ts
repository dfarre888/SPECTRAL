/**
 * Callers: vitest (lib test include)
 * Purpose: Matrix model unit tests
 * API/schema: synthetic ForceCatalogPlatformFull only
 * User instruction: execute PROMPT-CAPABILITY-MATRIX.md
 */

import { describe, expect, it } from 'vitest'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  applyColumnBudget,
  buildMatrixView,
  buildPossession,
  coveragePercent,
  normaliseCapabilityId,
  platformsWithAllCapabilities,
} from './matrix-model'

function stubPlatform(
  overrides: Partial<ForceCatalogPlatformFull> &
    Pick<ForceCatalogPlatformFull, 'id' | 'short_name'>,
): ForceCatalogPlatformFull {
  return {
    id: overrides.id,
    is_catalog: true,
    nation_code: overrides.nation_code ?? 'USA',
    nation_name: overrides.nation_name ?? 'United States',
    designation: overrides.designation ?? overrides.short_name,
    short_name: overrides.short_name,
    domain: overrides.domain ?? 'air',
    role: overrides.role ?? 'fighter',
    force_side: overrides.force_side ?? 'blue',
    open_source_summary: '',
    data_confidence: 'high',
    sources: [],
    service_status: 'in_service',
    program_stage: 'fielded',
    manufacturer: null,
    ioc_year: null,
    sensors: overrides.sensors ?? [],
    comms: overrides.comms ?? [],
    future: null,
  }
}

function link16(platformId: string) {
  return {
    id: `${platformId}-l16`,
    platform_id: platformId,
    kind: 'datalink' as const,
    standard: 'link16' as const,
    band: 'L' as const,
    label: 'Link-16',
    gateway_capable: false,
    comsec_note: null,
    pnt_dependent: true,
    data_confidence: 'high' as const,
    sources: [],
    boundary_note: null,
  }
}

function uhf(platformId: string) {
  return {
    id: `${platformId}-uhf`,
    platform_id: platformId,
    kind: 'voice_uhf' as const,
    standard: null,
    band: 'UHF' as const,
    label: 'UHF voice',
    gateway_capable: false,
    comsec_note: null,
    pnt_dependent: false,
    data_confidence: 'high' as const,
    sources: [],
    boundary_note: null,
  }
}

function aesA(platformId: string, sovereign = false) {
  return {
    id: `${platformId}-radar`,
    platform_id: platformId,
    kind: 'radar' as const,
    label: 'AESA fire-control',
    band: 'X',
    antenna: null,
    role: 'fire_control',
    can_detect: [],
    cannot_detect: [],
    strengths: null,
    limitations: null,
    confidence: 'curated' as const,
    intel_note: null,
    sources: [],
    performance_ref: sovereign ? ('SOVEREIGN_CORE_BOUNDARY' as const) : null,
  }
}

describe('normaliseCapabilityId', () => {
  it('collapses Link 16 aliases', () => {
    expect(normaliseCapabilityId('Link 16')).toBe('link16')
    expect(normaliseCapabilityId('link16')).toBe('link16')
    expect(normaliseCapabilityId('Link-16')).toBe('link16')
    expect(normaliseCapabilityId('JTIDS')).toBe('link16')
  })
})

describe('buildPossession / filters / impact', () => {
  const a = stubPlatform({
    id: 'A',
    short_name: 'Alpha',
    comms: [link16('A'), uhf('A')],
    sensors: [aesA('A')],
  })
  const b = stubPlatform({
    id: 'B',
    short_name: 'Bravo',
    force_side: 'red',
    nation_code: 'CHN',
    nation_name: 'China',
    comms: [uhf('B')],
    sensors: [],
  })
  const c = stubPlatform({
    id: 'C',
    short_name: 'Charlie',
    comms: [link16('C')],
    sensors: [aesA('C', true)],
  })

  it('AND capability filter keeps only platforms with all required caps', () => {
    const { possession } = buildPossession([a, b, c])
    const kept = platformsWithAllCapabilities([a, b, c], possession, ['comms:link16'])
    expect(kept.map((p) => p.id).sort()).toEqual(['A', 'C'])
  })

  it('counters use visible columns only; hide drives lost-to-zero', () => {
    const view = buildMatrixView({
      platforms: [a, b, c],
      hiddenPlatformIds: new Set(['A', 'C']),
      pinnedPlatformIds: [],
      capabilityFilterIds: [],
      kindFilter: 'all',
      capabilitySearch: '',
      sort: 'coverage',
    })
    expect(view.stats.platformCount).toBe(1)
    expect(view.stats.hiddenCount).toBe(2)
    expect(view.impact).not.toBeNull()
    expect(view.impact!.removed.map((r) => r.id).sort()).toEqual(['A', 'C'])
    const lostIds = view.impact!.lostEntirely.map((x) => x.id)
    expect(lostIds).toContain('comms:link16')
    expect(lostIds).toContain('sensors:aesa_fire_control')
  })

  it('coverage percent is share of rows with ≥1 HAS', () => {
    const { capabilities, possession } = buildPossession([a, b])
    const capIds = [...capabilities.keys()]
    expect(coveragePercent(capIds, ['A', 'B'], possession)).toBe(100)
  })

  it('marks sovereign sensor subtitle', () => {
    const view = buildMatrixView({
      platforms: [c],
      hiddenPlatformIds: new Set(),
      pinnedPlatformIds: [],
      capabilityFilterIds: [],
      kindFilter: 'sensors',
      capabilitySearch: '',
      sort: 'az',
    })
    const row = view.rows.find((r) => r.capability.id === 'sensors:aesa_fire_control')
    expect(row?.capability.sovereign).toBe(true)
    expect(row?.capability.subtitle).toMatch(/resolved in defence IDE/)
  })
})


describe('applyColumnBudget', () => {
  it('keeps densest platforms within budget', () => {
    const platforms = Array.from({ length: 30 }, (_, i) =>
      stubPlatform({
        id: `p${i}`,
        short_name: `P${i}`,
        comms: i < 10 ? [link16(`p${i}`)] : [],
        sensors: i < 5 ? [aesA(`p${i}`)] : [],
      }),
    )
    const view = buildMatrixView({
      platforms,
      hiddenPlatformIds: new Set(),
      pinnedPlatformIds: [],
      capabilityFilterIds: [],
      kindFilter: 'all',
      capabilitySearch: '',
      sort: 'coverage',
    })
    const out = applyColumnBudget(view.columns, view.rows, 24, false)
    expect(out.visible).toHaveLength(24)
    expect(out.truncated).toBe(true)
    expect(out.total).toBe(30)
  })
})
