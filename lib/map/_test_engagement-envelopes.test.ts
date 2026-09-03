import { describe, expect, it } from 'vitest'
import {
  ENGAGEMENT_ENVELOPES,
  UNKNOWN_PK_PLACEHOLDER,
  disagreementRatio,
  envelopeById,
  rangeUnderPosture,
  toThreatEmitters,
} from '@/lib/map/engagement-envelopes'

describe('envelope dataset integrity', () => {
  it('has unique ids', () => {
    const ids = ENGAGEMENT_ENVELOPES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cites a source for every entry', () => {
    for (const e of ENGAGEMENT_ENVELOPES) {
      expect(e.sources.length, `${e.id} sources`).toBeGreaterThan(0)
      expect(e.note.length, `${e.id} note`).toBeGreaterThan(20)
    }
  })

  it('keeps every interval ordered lo <= hi', () => {
    for (const e of ENGAGEMENT_ENVELOPES) {
      for (const [name, iv] of [
        ['kinematic', e.kinematicRangeM],
        ['effective', e.effectiveRangeM],
        ['detection', e.detectionRangeM],
        ['ceiling', e.ceilingM],
      ] as const) {
        if (!iv) continue
        expect(iv.loM, `${e.id} ${name}`).toBeLessThanOrEqual(iv.hiM)
      }
    }
  })

  it('never claims effective reach beyond kinematic reach', () => {
    for (const e of ENGAGEMENT_ENVELOPES) {
      if (!e.effectiveRangeM) continue
      expect(e.effectiveRangeM.hiM, `${e.id}`).toBeLessThanOrEqual(e.kinematicRangeM.hiM)
    }
  })

  it('records no Pk anywhere — it is not open-source', () => {
    for (const e of ENGAGEMENT_ENVELOPES) {
      expect(e, `${e.id}`).not.toHaveProperty('pk')
    }
  })

  it('marks contested entries where sources genuinely disagree', () => {
    const mse = envelopeById('patriot-pac3-mse')!
    expect(mse.confidence).toBe('contested')
    expect(mse.note).toContain('60 km')
  })

  it("holds the 40N6 effective range well below its kinematic 400 km", () => {
    const e = envelopeById('s400-40n6')!
    expect(e.kinematicRangeM.hiM).toBe(400_000)
    // Drawing a 400 km engagement ring would overstate the threat.
    expect(e.effectiveRangeM!.hiM).toBeLessThan(300_000)
    expect(e.note).toContain('radar horizon')
  })

  it('flags THAAD as not an anti-aircraft threat', () => {
    expect(envelopeById('thaad')!.note).toContain('Not an anti-aircraft system')
  })
})

describe('planning posture', () => {
  const iv = { loM: 100, hiM: 300 }

  it('takes the low figure when optimistic and the high when conservative', () => {
    expect(rangeUnderPosture(iv, 'optimistic')).toBe(100)
    expect(rangeUnderPosture(iv, 'conservative')).toBe(300)
    expect(rangeUnderPosture(iv, 'nominal')).toBe(200)
  })

  it('returns null for a missing interval', () => {
    expect(rangeUnderPosture(null, 'nominal')).toBeNull()
  })

  it('quantifies source disagreement', () => {
    expect(disagreementRatio(iv)).toBeCloseTo(1, 6)
    expect(disagreementRatio({ loM: 100, hiM: 100 })).toBe(0)
    expect(disagreementRatio(null)).toBe(0)
  })
})

describe('bridge to the route planner', () => {
  const placed = [{ envelopeId: 's400-48n6', lon: 0, lat: 0 }]

  it('uses effective range for engagement, not kinematic', () => {
    const [t] = toThreatEmitters(placed, 'conservative')
    const env = envelopeById('s400-48n6')!
    expect(t.engagementRangeM).toBe(env.effectiveRangeM!.hiM)
  })

  it('never lets engagement range exceed detection range', () => {
    for (const e of ENGAGEMENT_ENVELOPES) {
      const [t] = toThreatEmitters([{ envelopeId: e.id, lon: 0, lat: 0 }], 'conservative')
      expect(t.detectionRangeM, e.id).toBeGreaterThanOrEqual(t.engagementRangeM)
    }
  })

  it('marks a threat estimated when no accredited Pk is supplied', () => {
    const [t] = toThreatEmitters(placed)
    expect(t.pk).toBe(UNKNOWN_PK_PLACEHOLDER)
    expect(t.confidence).toBe('estimated')
  })

  it('improves confidence only when a Pk is actually provided', () => {
    const [t] = toThreatEmitters([{ ...placed[0], pk: 0.7 }])
    expect(t.pk).toBe(0.7)
    // s400-48n6 is a consensus envelope, so with a real Pk it reaches osint.
    expect(t.confidence).toBe('osint')
  })

  it('will not redeem a contested envelope with a good Pk', () => {
    const [t] = toThreatEmitters([{ envelopeId: 's400-40n6', lon: 0, lat: 0, pk: 0.9 }])
    expect(t.confidence).toBe('estimated')
  })

  it('grows the threat ring under a conservative posture', () => {
    const opt = toThreatEmitters(placed, 'optimistic')[0]
    const con = toThreatEmitters(placed, 'conservative')[0]
    expect(con.engagementRangeM).toBeGreaterThan(opt.engagementRangeM)
  })

  it('ignores an unknown envelope id rather than inventing one', () => {
    expect(toThreatEmitters([{ envelopeId: 'nope', lon: 0, lat: 0 }])).toEqual([])
  })
})
