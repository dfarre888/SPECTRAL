import { describe, expect, it } from 'vitest'
import {
  checkEnvelope,
  envelopeBandPct,
  sliderMaxFor,
  type EngagementEnvelope,
} from '@/lib/risk/envelope-explain'

// SA-7 Grail, from SAM_PROFILES.
const SA7: EngagementEnvelope = { minRangeM: 500, maxRangeM: 4_200, minAltM: 50, maxAltM: 2_300 }

describe('envelope check', () => {
  it('passes an engagement inside the envelope', () => {
    const r = checkEnvelope(SA7, 2_000, 500)
    expect(r.inEnvelope).toBe(true)
    expect(r.failures).toEqual([])
  })

  it('explains the SA-7 at 8 km case that read as a bug', () => {
    const r = checkEnvelope(SA7, 8_000, 500)
    expect(r.inEnvelope).toBe(false)
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0].axis).toBe('range_long')
    expect(r.failures[0].message).toContain('4.2 km')
    expect(r.failures[0].suggestM).toBe(4_200)
  })

  it('explains a shot taken inside minimum range', () => {
    const r = checkEnvelope(SA7, 200, 500)
    expect(r.failures[0].axis).toBe('range_short')
    expect(r.failures[0].message).toContain('cannot arm')
  })

  it('explains an altitude ceiling failure', () => {
    const r = checkEnvelope(SA7, 2_000, 9_000)
    expect(r.failures[0].axis).toBe('alt_high')
    expect(r.failures[0].suggestM).toBe(2_300)
  })

  it('explains a target below minimum altitude', () => {
    const r = checkEnvelope(SA7, 2_000, 10)
    expect(r.failures[0].axis).toBe('alt_low')
    expect(r.failures[0].message).toContain('clutter')
  })

  it('reports both axes when both fail', () => {
    const r = checkEnvelope(SA7, 9_000, 9_000)
    expect(r.failures.map((f) => f.axis)).toEqual(['range_long', 'alt_high'])
  })

  it('states plainly what is being computed', () => {
    const r = checkEnvelope(SA7, 2_000, 500, { systemLabel: 'SA-7 Grail', targetLabel: 'OWA' })
    expect(r.statement).toBe('SA-7 Grail engaging OWA at 2.0 km slant range, 500 m altitude.')
  })

  it('formats sub-kilometre values in metres', () => {
    expect(checkEnvelope(SA7, 200, 500).failures[0].message).toContain('200 m')
  })
})

describe('slider band', () => {
  it('places the valid band as a fraction of slider travel', () => {
    const b = envelopeBandPct(500, 4_200, 6_000)
    expect(b.leftPct).toBeCloseTo(8.33, 1)
    expect(b.widthPct).toBeCloseTo(61.67, 1)
  })

  it('clips a band that runs past the slider maximum', () => {
    const b = envelopeBandPct(1_000, 50_000, 10_000)
    expect(b.leftPct + b.widthPct).toBeLessThanOrEqual(100)
  })

  it('handles a zero-length slider without dividing by zero', () => {
    expect(envelopeBandPct(0, 100, 0)).toEqual({ leftPct: 0, widthPct: 0 })
  })
})

describe('slider scaling', () => {
  it('gives headroom past the envelope so the edge is visible', () => {
    expect(sliderMaxFor(4_200)).toBeGreaterThan(4_200)
  })

  it('scales with the system rather than pinning every one to the same axis', () => {
    expect(sliderMaxFor(4_200)).toBeLessThan(sliderMaxFor(150_000))
  })

  it('rounds to a tidy step', () => {
    expect(sliderMaxFor(4_200) % 500).toBe(0)
    expect(sliderMaxFor(150_000) % 10_000).toBe(0)
  })
})
