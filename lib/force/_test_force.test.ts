import { describe, expect, it } from 'vitest'
import { assembleNationForce, enrichPlatform } from '@/lib/force/assemble'
import { buildNationCompare } from '@/lib/force/compare'
import { classifyEffect, toNatoConfidence } from '@/lib/force/effects'
import { countryMatchesNation, getForceNation, parseNationCode } from '@/lib/force/nations'
import { packageToLaydown, resolveMapAssetId, theatreSeedAssetIds } from '@/lib/force/package-to-laydown'
import { getTheatre } from '@/lib/force/theatres'
import type { BmiPlatformRow, ForceNation } from '@/lib/force/types'
import type { MapAssetsPayload } from '@/lib/map/types'

function row(partial: Partial<BmiPlatformRow> & Pick<BmiPlatformRow, 'id' | 'designation'>): BmiPlatformRow {
  return {
    exercise_id: null,
    nation_code: 'AUS',
    nation_name: 'Australia',
    short_name: partial.designation,
    domain: 'air',
    role: 'other',
    qty: 1,
    force_side: 'blue',
    open_source_summary: '',
    data_confidence: 'high',
    sources: [],
    platform_library_id: null,
    is_catalog: true,
    manufacturer: null,
    service_status: 'in_service',
    ioc_year: 2020,
    program_stage: 'fielded',
    ...partial,
  }
}

describe('force nations', () => {
  it('parses the seven catalog codes only', () => {
    expect(parseNationCode('aus')).toBe('AUS')
    expect(parseNationCode('compare')).toBeNull()
    expect(getForceNation('CHN')?.side).toBe('red')
  })

  it('matches UAS country aliases', () => {
    expect(countryMatchesNation('Australia', 'AUS')).toBe(true)
    expect(countryMatchesNation('People\'s Republic of China', 'CHN')).toBe(true)
    expect(countryMatchesNation('United States', 'AUS')).toBe(false)
  })
})

describe('effect classifier', () => {
  it('uses role first', () => {
    expect(classifyEffect('aew_c', 'E-7A Wedgetail', 'E-7A', 'air')).toBe('find')
    expect(classifyEffect('tanker', 'KC-30A', 'KC-30A', 'air')).toBe('sustain')
    expect(classifyEffect('maritime_surface', 'Hobart Class', 'Hobart', 'maritime')).toBe('sea_control')
  })

  it('classifies other via designation', () => {
    expect(classifyEffect('other', 'S-400 Triumf', 'S-400', 'ground')).toBe('shield')
    expect(classifyEffect('other', 'Type 055 destroyer', 'Type 055', 'maritime')).toBe('sea_control')
    expect(classifyEffect('other', 'F-35A Lightning II', 'F-35A', 'air')).toBe('finish')
  })

  it('never promotes a datasheet row to Confirmed', () => {
    expect(toNatoConfidence('high')).toBe('Assessed')
    expect(toNatoConfidence('estimated')).toBe('Estimated')
  })
})

describe('nation compare', () => {
  it('builds an effect matrix with no winner field', () => {
    const aus: ForceNation = getForceNation('AUS')!
    const chn: ForceNation = getForceNation('CHN')!
    const a = assembleNationForce(aus, [
      enrichPlatform(row({ id: 'AUS-CAT-E7A', designation: 'E-7A Wedgetail', role: 'aew_c' }), [], [], [], []),
      enrichPlatform(row({ id: 'AUS-CAT-F35A', designation: 'F-35A Lightning II', role: 'multirole' }), [], [], [], []),
    ])
    const b = assembleNationForce(chn, [
      enrichPlatform(row({ id: 'CHN-CAT-J20', nation_code: 'CHN', designation: 'J-20', role: 'fighter', force_side: 'red' }), [], [], [], []),
      enrichPlatform(row({ id: 'CHN-CAT-J16', nation_code: 'CHN', designation: 'J-16', role: 'multirole', force_side: 'red' }), [], [], [], []),
      enrichPlatform(row({ id: 'CHN-CAT-S400', nation_code: 'CHN', designation: 'S-400', role: 'radar_ground', domain: 'ground', force_side: 'red' }), [], [], [], []),
    ])
    const cmp = buildNationCompare(a, b)
    expect(cmp.headline).toContain('not a winner')
    expect(cmp).not.toHaveProperty('winner')
    expect(cmp.cells).toHaveLength(6)
    expect(cmp.cells.find((c) => c.effect === 'find')?.a_count).toBe(1)
    expect(cmp.cells.find((c) => c.effect === 'shield')?.b_count).toBe(1)
    expect(cmp.caveat.toLowerCase()).toContain('campaign winner')
  })
})

describe('theatres and package', () => {
  it('has the three funded theatres', () => {
    expect(getTheatre('scs')?.defaultRed).toBe('CHN')
    expect(getTheatre('korea')?.defaultRed).toBe('PRK')
    expect(getTheatre('north-aus')?.defaultBlue).toBe('AUS')
  })

  it('places mapped UAS and lists unmatched ORBAT types', () => {
    const theatre = getTheatre('scs')!
    const catalog: MapAssetsPayload = {
      uas: [
        {
          id: 'mq-9-reaper',
          name: 'MQ-9 Reaper',
          slug: 'mq-9-reaper',
          category: 'MALE',
          categoryLabel: 'MALE',
          image_url: null,
          max_altitude_agl_m: 15000,
          altitude_reference: 'AGL',
          max_range_km: 1800,
          max_speed_kmh: 480,
          endurance_min: 1600,
          climb_rate_mpm: 300,
        },
      ],
      cuas: [],
      radars: [],
      effectors: [],
    }
    const mapped = enrichPlatform(
      row({ id: 'AUS-CAT-MQ9', designation: 'MQ-9 Reaper', short_name: 'MQ-9', platform_library_id: 'mq-9-reaper' }),
      [],
      [],
      [],
      [],
    )
    const orphan = enrichPlatform(row({ id: 'AUS-CAT-F35A', designation: 'F-35A Lightning II', short_name: 'F-35A' }), [], [], [], [])
    expect(resolveMapAssetId(mapped, catalog).assetId).toBe('mq-9-reaper')
    const built = packageToLaydown(theatre, [mapped, orphan], catalog)
    expect(built.placed).toBe(1)
    expect(built.unmatched.map((r) => r.id)).toEqual(['AUS-CAT-F35A'])
    expect(built.doc.viewport?.lat).toBe(theatre.lat)
    expect(theatreSeedAssetIds('scs').uas).toContain('mq-9-reaper')
  })
})
