import { describe, expect, it } from 'vitest'
import { SENSING_BANDS, bandFill, sensorBands, sensorsStatus } from './spectrum-bands'

const s = (band: string | null, bands?: string[]) => ({ band, bands } as never)

describe('spectrum bands', () => {
  it('falls back to band when bands is absent', () => {
    expect(sensorBands(s('X'))).toEqual(['X'])
    expect(sensorBands(s(null))).toEqual([])
  })
  it('prefers bands[]', () => {
    expect(sensorBands(s('IR', ['MWIR', 'VIS']))).toEqual(['MWIR', 'VIS'])
  })
  it('orders LWIR before VIS and X before LWIR', () => {
    expect(SENSING_BANDS.indexOf('LWIR')).toBeLessThan(SENSING_BANDS.indexOf('VIS'))
    expect(SENSING_BANDS.indexOf('X')).toBeLessThan(SENSING_BANDS.indexOf('LWIR'))
  })
  it('marks empty sensors as gap', () => {
    expect(sensorsStatus({ sensors: [] })).toBe('gap')
    expect(sensorsStatus({ sensors: [{}] })).toBe('listed')
  })
  it('drains a band when its only holder is benched', () => {
    const ps = [
      { id: 'A', sensors: [s('X')] },
      { id: 'B', sensors: [s('S'), s('S')] },
    ]
    const fill = bandFill(ps, new Set(['A']))
    expect(fill.find((f) => f.band === 'X')).toEqual({ band: 'X', active: 0, total: 1 })
    expect(fill.find((f) => f.band === 'S')).toEqual({ band: 'S', active: 1, total: 1 })
  })
})
