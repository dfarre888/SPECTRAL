import { describe, expect, it } from 'vitest'
import { PB26_COMMS, PB26_PLATFORMS, toCommsFits } from '@/data/seed-bmi-pitchblack2026'

describe('BMI comms matrix', () => {
  const fits = toCommsFits()

  it('every platform has at least one comms bearer', () => {
    for (const p of PB26_PLATFORMS) {
      const fit = fits.find((f) => f.platform_id === p.id)
      expect(fit?.bearers.length).toBeGreaterThan(0)
    }
  })

  it('E-7A has gateway_capable Link 16 bearer', () => {
    const e7 = PB26_COMMS.filter((c) => c.platform_id === 'AUS-E7A')
    expect(e7.some((b) => b.standard === 'link16' && b.gateway_capable)).toBe(true)
  })

  it('every datalink bearer carries comsec_note', () => {
    const datalinks = PB26_COMMS.filter((c) => c.kind === 'datalink')
    expect(datalinks.length).toBeGreaterThan(0)
    for (const d of datalinks) {
      expect(d.comsec_note).toBeTruthy()
    }
  })

  it('every link16 bearer is pnt_dependent', () => {
    const link16 = PB26_COMMS.filter((c) => c.standard === 'link16')
    expect(link16.length).toBeGreaterThan(0)
    for (const l of link16) {
      expect(l.pnt_dependent).toBe(true)
    }
  })

  it('F-35A fit includes both MADL and Link 16', () => {
    const f35 = PB26_COMMS.filter((c) => c.platform_id === 'JPN-F35A')
    expect(f35.some((b) => b.standard === 'madl')).toBe(true)
    expect(f35.some((b) => b.standard === 'link16')).toBe(true)
  })

  it('no bearer contains crypto key material', () => {
    const json = JSON.stringify(PB26_COMMS)
    expect(json).not.toMatch(/crypto_key|key_material|fill_pattern|net_id/i)
  })

  it('every fit has data_confidence and sources', () => {
    for (const f of fits) {
      expect(f.data_confidence).toBeTruthy()
      expect(f.sources.length).toBeGreaterThan(0)
    }
  })

  it('band values are valid FreqBand members', () => {
    const valid = new Set(['HF', 'VHF', 'UHF', 'L', 'S', 'C', 'X', 'Ku', 'Ka'])
    for (const c of PB26_COMMS) {
      expect(valid.has(c.band)).toBe(true)
    }
  })
})
