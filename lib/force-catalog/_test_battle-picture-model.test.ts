/**
 * Callers: vitest
 * Purpose: Battle Picture model — presets, bands, assess text
 */

import { describe, expect, it } from 'vitest'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import {
  applyScenarioPreset,
  assessBand,
  buildBattlePictureView,
  effectsForPlatform,
  getPreset,
  SCENARIO_PRESETS,
} from './battle-picture-model'

function stub(
  overrides: Partial<ForceCatalogPlatformFull> & Pick<ForceCatalogPlatformFull, 'id' | 'short_name'>,
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
    open_source_summary: overrides.open_source_summary ?? '',
    data_confidence: overrides.data_confidence ?? 'high',
    sources: [],
    service_status: 'in_service',
    program_stage: 'fielded',
    manufacturer: null,
    ioc_year: null,
    sensors: overrides.sensors ?? [],
    comms: overrides.comms ?? [],
    platform_library_id: overrides.platform_library_id ?? null,
    future: null,
  }
}

describe('assessBand', () => {
  it('returns THIN DATA when total < 2', () => {
    expect(assessBand(1, 0)).toBe('THIN DATA')
    expect(assessBand(0, 0)).toBe('THIN DATA')
  })
  it('returns OVERMATCH when Blue denser', () => {
    expect(assessBand(6, 2)).toBe('OVERMATCH')
  })
  it('returns UNDERDOG when Red denser', () => {
    expect(assessBand(2, 6)).toBe('UNDERDOG')
  })
  it('returns CONTESTED near parity', () => {
    expect(assessBand(4, 4)).toBe('CONTESTED')
  })
})

describe('effectsForPlatform', () => {
  it('maps fighter to air_superiority', () => {
    expect(effectsForPlatform(stub({ id: 'a', short_name: 'F-16', role: 'fighter' }))).toContain(
      'air_superiority',
    )
  })
  it('maps Shahed summary to owa_loiter', () => {
    const e = effectsForPlatform(
      stub({
        id: 'b',
        short_name: 'Geran-2',
        role: 'other',
        force_side: 'red',
        open_source_summary: 'combat-proven: Ukraine 2022–26. Shahed-class OWA.',
      }),
    )
    expect(e).toContain('owa_loiter')
  })
  it('maps Patriot to amd_bmd', () => {
    expect(
      effectsForPlatform(
        stub({ id: 'c', short_name: 'Patriot', role: 'radar_ground', domain: 'ground' }),
      ),
    ).toContain('amd_bmd')
  })
})

describe('applyScenarioPreset', () => {
  it('filters ukraine-2026 nations', () => {
    const platforms = [
      stub({ id: '1', short_name: 'U', nation_code: 'UKR', force_side: 'blue' }),
      stub({ id: '2', short_name: 'R', nation_code: 'RUS', force_side: 'red' }),
      stub({ id: '3', short_name: 'C', nation_code: 'CHN', force_side: 'red' }),
    ]
    const out = applyScenarioPreset(platforms, getPreset('ukraine-2026'))
    expect(out.map((p) => p.nation_code).sort()).toEqual(['RUS', 'UKR'])
  })
  it('pb26-blue excludes red sides', () => {
    const platforms = [
      stub({ id: '1', short_name: 'A', nation_code: 'AUS', force_side: 'blue' }),
      stub({ id: '2', short_name: 'P', nation_code: 'PAK', force_side: 'red' }),
    ]
    const out = applyScenarioPreset(platforms, getPreset('pb26-blue'))
    expect(out).toHaveLength(1)
    expect(out[0].nation_code).toBe('AUS')
  })
})

describe('buildBattlePictureView', () => {
  it('emits deterministic assess text and ten effects', () => {
    const platforms = [
      stub({ id: '1', short_name: 'F-35', role: 'multirole', force_side: 'blue', nation_code: 'USA' }),
      stub({ id: '2', short_name: 'F-35b', role: 'multirole', force_side: 'blue', nation_code: 'USA' }),
      stub({ id: '3', short_name: 'Su-35', role: 'multirole', force_side: 'red', nation_code: 'RUS' }),
      stub({
        id: '4',
        short_name: 'Patriot',
        role: 'radar_ground',
        domain: 'ground',
        force_side: 'blue',
        nation_code: 'USA',
      }),
    ]
    const view = buildBattlePictureView(platforms, 'ukraine-2026')
    expect(view.effects).toHaveLength(10)
    expect(view.assessText).toMatch(/^ASSESS — Ukraine 2026/)
    expect(view.assessText).toContain('So what:')
    expect(SCENARIO_PRESETS).toHaveLength(4)
  })
})
