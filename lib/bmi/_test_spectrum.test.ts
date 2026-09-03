import { describe, expect, it } from 'vitest'
import { toCommsFits } from '@/data/seed-bmi-pitchblack2026'
import { COMMS_BAND_REFERENCE, spectrumPlanner } from '@/lib/bmi/spectrumPlanner'

describe('BMI comms spectrum planner', () => {
  const fits = toCommsFits()

  it('analyseSpectrum returns occupancy for bands with bearers', () => {
    const plan = spectrumPlanner.analyseSpectrum(fits)
    expect(plan.occupancy.length).toBeGreaterThan(0)
  })

  it('L-band flagged as backbone when Link 16 bearers exist', () => {
    const plan = spectrumPlanner.analyseSpectrum(fits)
    expect(plan.backbone_band).toBe('L')
  })

  it('congestion rises to congested past bearer-count threshold', () => {
    const manyFits = Array.from({ length: 8 }, (_, i) => ({
      ...fits[0]!,
      platform_id: `SYN-${i}`,
      bearers: fits[0]!.bearers,
    }))
    const plan = spectrumPlanner.analyseSpectrum(manyFits)
    const lBand = plan.occupancy.find((o) => o.band === 'L')
    expect(lBand?.congestion).toBe('congested')
  })

  it('datalink_present true for band carrying Link 16', () => {
    const plan = spectrumPlanner.analyseSpectrum(fits)
    const lBand = plan.occupancy.find((o) => o.band === 'L')
    expect(lBand?.datalink_present).toBe(true)
  })

  it('pnt_note references GPS/Link 16 timing', () => {
    const plan = spectrumPlanner.analyseSpectrum(fits)
    expect(plan.pnt_note).toMatch(/GPS|PNT|Link 16/i)
  })

  it('plotPoints returns valid x_mhz inside band range', () => {
    const points = spectrumPlanner.plotPoints(fits)
    expect(points.length).toBeGreaterThan(0)
    for (const pt of points) {
      const ref = COMMS_BAND_REFERENCE[pt.band]
      expect(pt.x_mhz).toBeGreaterThanOrEqual(ref.range_mhz[0])
      expect(pt.x_mhz).toBeLessThanOrEqual(ref.range_mhz[1])
    }
  })

  it('no threat radar detection data in spectrum output', () => {
    const plan = spectrumPlanner.analyseSpectrum(fits)
    const json = JSON.stringify(plan)
    expect(json).not.toMatch(/can_detect|radar_emit|threat_emitter/i)
  })
})
