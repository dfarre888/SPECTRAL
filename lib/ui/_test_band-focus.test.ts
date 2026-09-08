import { describe, expect, it } from 'vitest'
import {
  BANDS,
  anyBandMatches,
  bandsOf,
  focusState,
  multiFocusState,
  normaliseBand,
} from '@/lib/ui/band-focus'

describe('band normalisation', () => {
  it('accepts the canonical form', () => {
    expect(normaliseBand('UHF')).toBe('UHF')
  })

  it('accepts the shapes the codebase actually stores', () => {
    // Bearers store voice_uhf, tiles store lowercase, rows store upper.
    expect(normaliseBand('voice_uhf')).toBe('UHF')
    expect(normaliseBand('data_satcom')).toBeNull() // not a band
    expect(normaliseBand('uhf')).toBe('UHF')
    expect(normaliseBand(' Ku ')).toBe('Ku')
  })

  it('returns null rather than guessing at an unknown band', () => {
    expect(normaliseBand('ZZZ')).toBeNull()
    expect(normaliseBand('')).toBeNull()
    expect(normaliseBand(null)).toBeNull()
    expect(normaliseBand(undefined)).toBeNull()
  })
})

describe('focus state', () => {
  it('leaves everything neutral when nothing is focused', () => {
    expect(focusState('UHF', null)).toBe('neutral')
    expect(focusState(null, null)).toBe('neutral')
  })

  it('lifts the matching band and recedes the rest', () => {
    expect(focusState('UHF', 'UHF')).toBe('focused')
    expect(focusState('HF', 'UHF')).toBe('dimmed')
  })

  it('matches across storage shapes', () => {
    expect(focusState('voice_uhf', 'UHF')).toBe('focused')
    expect(focusState('UHF', 'voice_uhf')).toBe('focused')
  })

  it('dims an element with no band when something is focused', () => {
    expect(focusState(null, 'UHF')).toBe('dimmed')
  })

  it('stays neutral if the focused band is unrecognised', () => {
    // A bad value must not blank the page.
    expect(focusState('UHF', 'nonsense')).toBe('neutral')
  })
})

describe('multi-band elements', () => {
  it('collects and orders bands low to high', () => {
    expect(bandsOf(['X', 'HF', 'voice_uhf', 'HF'])).toEqual(['HF', 'UHF', 'X'])
  })

  it('drops unknown values instead of surfacing them', () => {
    expect(bandsOf(['HF', 'ZZZ', null])).toEqual(['HF'])
  })

  it('lights up a multi-band platform on either of its bands', () => {
    const e7a = ['L', 'voice_uhf', 'voice_hf']
    expect(anyBandMatches(e7a, 'HF')).toBe(true)
    expect(anyBandMatches(e7a, 'UHF')).toBe(true)
    expect(anyBandMatches(e7a, 'L')).toBe(true)
    expect(anyBandMatches(e7a, 'X')).toBe(false)
  })

  it('resolves multi-band elements to a single render state', () => {
    const e7a = ['L', 'voice_uhf']
    expect(multiFocusState(e7a, null)).toBe('neutral')
    expect(multiFocusState(e7a, 'UHF')).toBe('focused')
    expect(multiFocusState(e7a, 'X')).toBe('dimmed')
  })

  it('handles an element with no bands at all', () => {
    expect(multiFocusState([], 'UHF')).toBe('dimmed')
    expect(multiFocusState([], null)).toBe('neutral')
  })
})

describe('band vocabulary', () => {
  it('runs low frequency to high', () => {
    expect(BANDS.indexOf('HF')).toBeLessThan(BANDS.indexOf('UHF'))
    expect(BANDS.indexOf('UHF')).toBeLessThan(BANDS.indexOf('X'))
    expect(BANDS.indexOf('X')).toBeLessThan(BANDS.indexOf('Ku'))
  })

  it('covers the bands the catalogue uses', () => {
    for (const b of ['HF', 'VHF', 'UHF', 'L', 'X', 'Ku', 'IR']) {
      expect(BANDS).toContain(b as never)
    }
  })
})
