import { describe, expect, it } from 'vitest'
import type { CommsBearer, ForceCatalogPlatformFull, PlatformSensor } from '@/lib/bmi/bmi-types'
import { buildCoverage } from './coverage-model'

function bearer(pid: string, standard: CommsBearer['standard'], kind: CommsBearer['kind'], gw = false): CommsBearer {
  return {
    id: `${pid}-${standard ?? kind}`, platform_id: pid, kind, standard, band: 'UHF',
    label: standard ?? kind, gateway_capable: gw, comsec_note: null, pnt_dependent: true,
    data_confidence: 'medium' as never, sources: [], boundary_note: null,
  }
}
function sensor(pid: string, kind: PlatformSensor['kind'], band: string | null, bands?: string[]): PlatformSensor {
  return {
    id: `${pid}-${kind}-${band}`, platform_id: pid, kind, label: `${kind} ${band}`, band, bands, antenna: null, role: null,
    can_detect: [], cannot_detect: [], strengths: null, limitations: null, confidence: 'medium' as never,
    intel_note: null, sources: [],
  }
}
function plat(id: string, side: 'blue' | 'red' | 'neutral', sensors: PlatformSensor[], comms: CommsBearer[]): ForceCatalogPlatformFull {
  return {
    id, is_catalog: true, nation_code: 'AUS', nation_name: 'Australia', designation: id, short_name: id,
    manufacturer: null, domain: 'air', role: 'fighter' as never, force_side: side, service_status: 'in_service' as never,
    program_stage: 'fielded' as never, ioc_year: null, open_source_summary: '', data_confidence: 'medium' as never,
    sources: [], sensors, comms,
  }
}

const A = plat('A', 'blue', [sensor('A', 'radar', 'X'), sensor('A', 'eo_ir', 'IR', ['MWIR', 'VIS'])], [bearer('A', 'link16', 'datalink'), bearer('A', null, 'voice_uhf')])
const B = plat('B', 'red', [], [bearer('B', 'link16', 'datalink')])
const C = plat('C', 'blue', [], [bearer('C', null, 'voice_uhf')])

describe('coverage model', () => {
  it('ghosts the pre-bench count and lists what was lost', () => {
    const r = buildCoverage({ platforms: [A, B, C], benched: new Set(['A']), sort: 'coverage' })
    const x = r.sections.find((s) => s.kind === 'radar')!.rows.find((row) => row.band === 'X')!
    expect(x).toMatchObject({ active: 0, ghost: 1, lostWith: ['A'] })
    expect(r.benchedCount).toBe(1)
    expect(r.activeCount).toBe(2)
  })
  it('segments net bars by side and reports gateways', () => {
    const r = buildCoverage({ platforms: [A, B, C], benched: new Set(), sort: 'coverage' })
    const l16 = r.sections[0].rows.find((row) => row.id === 'std:link16')!
    expect(l16.bySide).toEqual({ blue: 1, red: 1, neutral: 0 })
    expect(l16.tier).toBe('track')
    expect(l16.gateways).toBe(0)
  })
  it('splits a multi-band EO/IR sensor into one row per band', () => {
    const r = buildCoverage({ platforms: [A], benched: new Set(), sort: 'az' })
    const eoir = r.sections.find((s) => s.kind === 'eoir')!.rows.map((x) => x.band)
    expect(eoir.sort()).toEqual(['MWIR', 'VIS'])
  })
  it('surfaces a hatched no-data row when nobody in scope lists sensors', () => {
    const r = buildCoverage({ platforms: [B, C], benched: new Set(), sort: 'coverage' })
    const radar = r.sections.find((s) => s.kind === 'radar')!
    expect(radar.rows).toHaveLength(1)
    expect(radar.rows[0].noData).toBe(true)
    expect(r.sensorGapCount).toBe(2)
  })
  it('does not duplicate datalinks under other capabilities', () => {
    const r = buildCoverage({ platforms: [A, B, C], benched: new Set(), sort: 'coverage' })
    const other = r.sections.find((s) => s.kind === 'other')!.rows.map((x) => x.id)
    expect(other.some((id) => id.includes('link16'))).toBe(false)
    expect(other.some((id) => id.includes('voice'))).toBe(true)
  })
  it('coverage percent ignores no-data rows', () => {
    const r = buildCoverage({ platforms: [B, C], benched: new Set(), sort: 'coverage' })
    expect(r.coveragePct).toBe(100)
  })
})
