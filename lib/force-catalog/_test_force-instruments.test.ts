import { describe, expect, it } from 'vitest'
import type { CommsBearer, ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { buildForceInstruments } from './force-instruments'

function bearer(pid: string, standard: CommsBearer['standard'], kind: CommsBearer['kind'], gw = false, pnt = true, variant?: string): CommsBearer {
  return {
    id: `${pid}-${standard ?? kind}-${variant ?? ''}`, platform_id: pid, kind, standard, variant, band: 'UHF',
    label: standard ?? kind, gateway_capable: gw, comsec_note: null, pnt_dependent: pnt,
    data_confidence: 'medium' as never, sources: [], boundary_note: null,
  }
}
function plat(id: string, side: 'blue' | 'red', comms: CommsBearer[], nation = 'AUS'): ForceCatalogPlatformFull {
  return {
    id, is_catalog: true, nation_code: nation, nation_name: nation, designation: id, short_name: id,
    manufacturer: null, domain: 'air', role: 'fighter' as never, force_side: side, service_status: 'in_service' as never,
    program_stage: 'fielded' as never, ioc_year: null, open_source_summary: '', data_confidence: 'medium' as never,
    sources: [], sensors: [], comms,
  }
}

describe('force instruments', () => {
  it('finds the gateway whose loss strands the most units', () => {
    // A (Link 16 + MADL gateway) joins two F-35s on MADL to a Link 16 ship.
    const ps = [
      plat('GW', 'blue', [bearer('GW', 'link16', 'datalink', true), bearer('GW', 'madl', 'datalink', true)]),
      plat('F1', 'blue', [bearer('F1', 'madl', 'datalink')]),
      plat('F2', 'blue', [bearer('F2', 'madl', 'datalink')]),
      plat('SHIP', 'blue', [bearer('SHIP', 'link16', 'datalink')]),
      plat('R1', 'red', [bearer('R1', 'national', 'datalink')]),
    ]
    const r = buildForceInstruments(ps)
    expect(r.blue.count).toBe(4)
    expect(r.red.count).toBe(1)
    expect(r.track.reachPct).toBe(100)
    expect(r.spof?.id).toBe('GW')
    expect(r.spof!.reachDropPct).toBeGreaterThan(0)
  })
  it('reports GNSS-denial drop and units falling to voice', () => {
    const ps = [
      plat('A', 'blue', [bearer('A', 'link16', 'datalink', false, true), bearer('A', null, 'voice_uhf', false, false)]),
      plat('B', 'blue', [bearer('B', 'link16', 'datalink', false, true)]),
      plat('C', 'blue', [bearer('C', 'link11', 'datalink', false, false)]),
    ]
    const r = buildForceInstruments(ps)
    expect(r.denied.dropToVoice).toBe(2)
    expect(r.denied.dropPts).toBeGreaterThan(0)
  })
  it('detects a standard split across islands by variant', () => {
    const ps = [
      plat('A', 'blue', [bearer('A', 'link22', 'datalink', false, true, 'link22-hf')]),
      plat('B', 'blue', [bearer('B', 'link22', 'datalink', false, true, 'link22-uhf')]),
    ]
    const r = buildForceInstruments(ps)
    expect(r.variantSplits).toEqual([{ standard: 'link22', islands: 2 }])
  })
})
