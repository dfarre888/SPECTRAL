/**
 * SPECTRAL — EW propagation + deconfliction tests
 */
import { describe, it, expect } from 'vitest'
import { EwPropagationEngine } from '@/lib/ew/ewPropagationEngine'
import { SpectrumDeconflictionEngine, EW_ADVERSARY_EFFECTIVENESS_REF } from '@/lib/ew/spectrumDeconflictionEngine'
import { BAND_REFERENCE } from '@/lib/gnss/types'

const ew = new EwPropagationEngine()

describe('EwPropagationEngine', () => {
  it('fsplDb at 1 km / 2.4 GHz is in expected ITU band', () => {
    const fspl = ew.fsplDb(1000, 2.4e9)
    expect(fspl).toBeGreaterThan(90)
    expect(fspl).toBeLessThan(110)
  })

  it('fsplDb increases with distance', () => {
    expect(ew.fsplDb(2000, 1.575e9)).toBeGreaterThan(ew.fsplDb(1000, 1.575e9))
  })

  it('jsRatioToEffectPct is low below threshold', () => {
    expect(ew.jsRatioToEffectPct(0, 10)).toBeLessThan(50)
  })

  it('jsRatioToEffectPct approaches 100 at strong J/S', () => {
    expect(ew.jsRatioToEffectPct(30, 10)).toBeGreaterThan(90)
  })

  it('computeEffectByRange returns monotonic range steps', () => {
    const curve = ew.computeEffectByRange({ band: 'GPS_L1', erp_watts: 100 }, 20_000, 10)
    expect(curve).toHaveLength(10)
    expect(curve[9].range_m).toBeGreaterThan(curve[0].range_m)
  })

  it('effect decreases with range along curve', () => {
    const curve = ew.computeEffectByRange({ band: 'control_link_2_4ghz', erp_watts: 50 }, 15_000, 12)
    expect(curve[0].effect_pct).toBeGreaterThan(curve[curve.length - 1].effect_pct)
  })

  it('computeFootprint returns positive effective radius', () => {
    const fp = ew.computeFootprint({ band: 'GPS_L1', erp_watts: 200 })
    expect(fp.effective_radius_m).toBeGreaterThan(100)
    expect(fp.curve.length).toBeGreaterThan(0)
  })

  it('higher ERP yields larger footprint radius', () => {
    const low = ew.computeFootprint({ band: 'GPS_L1', erp_watts: 10 }).effective_radius_m
    const high = ew.computeFootprint({ band: 'GPS_L1', erp_watts: 500 }).effective_radius_m
    expect(high).toBeGreaterThan(low)
  })

  it('uses BAND_REFERENCE label in footprint result', () => {
    const fp = ew.computeFootprint({ band: 'GPS_L1', erp_watts: 80 })
    expect(fp.band_label).toBe(BAND_REFERENCE.GPS_L1.label)
    expect(fp.centre_mhz).toBe(BAND_REFERENCE.GPS_L1.centre_mhz)
  })

  it('centreHzForBand maps NavIC L5 reference frequency', () => {
    const hz = ew.centreHzForBand('GPS_L5')
    expect(hz).toBeCloseTo(1176.45e6, -3)
  })

  it('jsRatioToEffectPct clamps 0–100', () => {
    expect(ew.jsRatioToEffectPct(-50)).toBeGreaterThanOrEqual(0)
    expect(ew.jsRatioToEffectPct(80)).toBeLessThanOrEqual(100)
  })
})

describe('SpectrumDeconflictionEngine', () => {
  it('sets adversary_effectiveness_ref to SOVEREIGN boundary', () => {
    const d = new SpectrumDeconflictionEngine().analyseDeconfliction([])
    expect(d.adversary_effectiveness_ref).toBe(EW_ADVERSARY_EFFECTIVENESS_REF)
    expect(EW_ADVERSARY_EFFECTIVENESS_REF).toBe('SOVEREIGN_CORE_BOUNDARY')
  })
})
