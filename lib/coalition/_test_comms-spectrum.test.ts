import { describe, expect, it } from 'vitest'
import {
  BEARER_SPECTRUM,
  findContention,
  formatMhz,
  spectrumForNet,
} from '@/lib/coalition/comms-spectrum'
import { DATALINK_SPECS } from '@/lib/coalition/datalink-matrix'

describe('comms spectrum placement', () => {
  it('places every coalition datalink standard on the axis', () => {
    for (const std of Object.keys(DATALINK_SPECS)) {
      const key = std === 'national' ? 'national:AUS' : `std:${std}`
      expect(spectrumForNet(key), `no spectrum for ${key}`).not.toBeNull()
    }
  })

  it('scopes indigenous link spectrum to the nation in the key', () => {
    const s = spectrumForNet('national:CHN')
    expect(s?.label).toBe('National datalink (CHN)')
    expect(s?.spans.length).toBeGreaterThan(0)
  })

  it('returns null for a net it cannot place', () => {
    expect(spectrumForNet('std:nonsense')).toBeNull()
  })

  it('gives Link 22 both an HF and a UHF leg', () => {
    const s = BEARER_SPECTRUM['std:link22']
    expect(s.spans).toHaveLength(2)
    expect(s.spans.some((x) => x.hiMhz <= 30)).toBe(true)
    expect(s.spans.some((x) => x.loMhz >= 225)).toBe(true)
  })

  it('finds UHF contention between voice and the Link 22 UHF leg', () => {
    const c = findContention(['voice:UHF', 'std:link22'])
    expect(c.length).toBeGreaterThan(0)
    const uhf = c.find((x) => x.loMhz >= 225 && x.hiMhz <= 400)
    expect(uhf).toBeDefined()
    expect(uhf!.netKeys).toEqual(['std:link22', 'voice:UHF'])
  })

  it('reports no contention when links do not share spectrum', () => {
    // Link 16 sits at 960-1215; MADL is Ku.
    expect(findContention(['std:link16', 'std:madl'])).toEqual([])
  })

  it('shows HF voice and the Link 22 HF leg contending', () => {
    const c = findContention(['voice:HF', 'std:link22'])
    expect(c.some((x) => x.hiMhz <= 30)).toBe(true)
  })

  it('merges adjacent stretches carrying the same nets', () => {
    const c = findContention(['voice:UHF', 'std:link11', 'std:link22'])
    // 225-400 is one contended stretch, not three fragments.
    const uhf = c.filter((x) => x.loMhz >= 225 && x.hiMhz <= 400)
    expect(uhf).toHaveLength(1)
    expect(uhf[0].netKeys).toHaveLength(3)
  })

  it('formats axis labels in MHz and GHz', () => {
    expect(formatMhz(400)).toBe('400 MHz')
    expect(formatMhz(1000)).toBe('1 GHz')
    expect(formatMhz(14500)).toBe('14.5 GHz')
  })
})
