import { describe, expect, it } from 'vitest'
import {
  formatCatalogDisplayName,
  formatRadarDisplayName,
  looksLikeIndustrialDesignator,
  splitCatalogName,
} from '@/lib/map/catalog-display-name'

describe('catalog-display-name', () => {
  it('treats GRAU and AN/ tokens as designators', () => {
    expect(looksLikeIndustrialDesignator('91N6E')).toBe(true)
    expect(looksLikeIndustrialDesignator('91N6A(M)')).toBe(true)
    expect(looksLikeIndustrialDesignator('64N6E')).toBe(true)
    expect(looksLikeIndustrialDesignator('AN/TPY-2')).toBe(true)
    expect(looksLikeIndustrialDesignator('AN/SPY-6(V)')).toBe(true)
    expect(looksLikeIndustrialDesignator('Giraffe AMB')).toBe(false)
    expect(looksLikeIndustrialDesignator('S-400 Triumf')).toBe(false)
    expect(looksLikeIndustrialDesignator('Big Bird')).toBe(false)
  })

  it('splits designator-first seed names', () => {
    expect(splitCatalogName('91N6E')).toEqual({ designator: '91N6E', embeddedName: null })
    expect(splitCatalogName('91N6A(M) (S-500 BMEW)')).toEqual({
      designator: '91N6A(M)',
      embeddedName: 'S-500 BMEW',
    })
    expect(splitCatalogName('1RL144 Hot Shot')).toEqual({
      designator: '1RL144',
      embeddedName: 'Hot Shot',
    })
    expect(splitCatalogName('Kasta-2E2 (39N6)')).toEqual({
      designator: '39N6',
      embeddedName: 'Kasta-2E2',
    })
  })

  it('puts NATO / system name first and the alphanumeric second', () => {
    expect(
      formatCatalogDisplayName({
        name: '91N6E',
        natoName: 'Big Bird',
        parentSystem: 'S-400 Triumf (SA-21)',
      }),
    ).toBe('Big Bird (91N6E)')

    expect(
      formatCatalogDisplayName({
        name: '64N6E',
        natoName: 'Tombstone',
        parentSystem: 'S-300PMU-1/2',
      }),
    ).toBe('Tombstone (64N6E)')

    expect(
      formatCatalogDisplayName({
        name: '91N6A(M) (S-500 BMEW)',
        natoName: null,
        parentSystem: 'S-500 Prometheus',
      }),
    ).toBe('S-500 Prometheus (91N6A(M))')

    expect(
      formatRadarDisplayName({
        name: 'AN/TPY-2',
        nato_name: null,
        associated_system: 'THAAD',
      }),
    ).toBe('THAAD (AN/TPY-2)')

    expect(
      formatCatalogDisplayName({
        name: '1RL144 Hot Shot',
        natoName: 'Hot Shot',
        parentSystem: '2K22 Tunguska',
      }),
    ).toBe('Hot Shot (1RL144)')
  })

  it('leaves names that are already spoken-name first', () => {
    expect(formatCatalogDisplayName({ name: 'Giraffe AMB' })).toBe('Giraffe AMB')
    expect(formatCatalogDisplayName({ name: 'S-400 (40N6)' })).toBe('S-400 (40N6)')
    expect(formatCatalogDisplayName({ name: 'S-400 (40N6)', parentSystem: 'S-400 Triumf' })).toBe(
      'S-400 Triumf (40N6)',
    )
    expect(formatCatalogDisplayName({ name: 'Iron Beam' })).toBe('Iron Beam')
  })
})
