import { describe, expect, it } from 'vitest'
import {
  COST_ENTRIES,
  allExchanges,
  costById,
  exchangeRatio,
  formatRatio,
  formatUsd,
  recommendedAgainst,
  verdictFor,
} from '@/lib/planner/cost-model'

describe('cost dataset integrity', () => {
  it('has unique ids', () => {
    const ids = COST_ENTRIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cites a source and explains itself for every entry', () => {
    for (const c of COST_ENTRIES) {
      expect(c.sources.length, `${c.id} sources`).toBeGreaterThan(0)
      expect(c.note.length, `${c.id} note`).toBeGreaterThan(20)
    }
  })

  it('keeps every interval ordered and positive', () => {
    for (const c of COST_ENTRIES) {
      expect(c.perEngagementUsd.loUsd, c.id).toBeGreaterThan(0)
      expect(c.perEngagementUsd.loUsd, c.id).toBeLessThanOrEqual(c.perEngagementUsd.hiUsd)
    }
  })

  it('has both threats and effectors', () => {
    expect(COST_ENTRIES.filter((c) => c.side === 'threat').length).toBeGreaterThan(3)
    expect(COST_ENTRIES.filter((c) => c.side === 'effector').length).toBeGreaterThan(5)
  })

  it('records the Shahed disagreement rather than a point estimate', () => {
    const s = costById('shahed-136')!
    expect(s.confidence).toBe('contested')
    expect(s.perEngagementUsd.hiUsd / s.perEngagementUsd.loUsd).toBeGreaterThanOrEqual(2)
    expect(s.note).toContain('CSIS')
  })

  it('prices reusable effects at marginal cost, not acquisition', () => {
    for (const id of ['rf-jammer', 'hpm', 'hel-laser']) {
      const e = costById(id)!
      expect(e.reusable).toBe(true)
      // A shot must be orders of magnitude below a SAM round.
      expect(e.perEngagementUsd.hiUsd).toBeLessThan(1_000)
    }
  })
})

describe('exchange ratio', () => {
  const shahed = costById('shahed-136')!
  const pac3 = costById('pac3-mse')!
  const laser = costById('hel-laser')!

  it('returns a band, not a point estimate', () => {
    const x = exchangeRatio(shahed, pac3)
    expect(x.loRatio).toBeLessThan(x.hiRatio)
    // Roughly 84:1 at best, 265:1 at worst.
    expect(x.loRatio).toBeGreaterThan(50)
    expect(x.hiRatio).toBeLessThan(400)
  })

  it('uses a geometric midpoint for a ratio spanning orders of magnitude', () => {
    const x = exchangeRatio(shahed, pac3)
    expect(x.midRatio).toBeCloseTo(Math.sqrt(x.loRatio * x.hiRatio), 6)
    // Geometric mid sits below the arithmetic mid for a skewed band.
    expect(x.midRatio).toBeLessThan((x.loRatio + x.hiRatio) / 2)
  })

  it('rates a Patriot round against a Shahed as catastrophic', () => {
    expect(exchangeRatio(shahed, pac3).verdict).toBe('catastrophic')
  })

  it('rates a laser against a Shahed as favourable', () => {
    expect(exchangeRatio(shahed, laser).verdict).toBe('favourable')
    expect(exchangeRatio(shahed, laser).loRatio).toBeLessThan(1)
  })

  it('takes the weaker of the two provenances', () => {
    // Shahed is contested, PAC-3 is consensus.
    expect(exchangeRatio(shahed, pac3).confidence).toBe('contested')
  })

  it('judges the verdict on the optimistic end of the band', () => {
    expect(verdictFor(0.5)).toBe('favourable')
    expect(verdictFor(3)).toBe('acceptable')
    expect(verdictFor(20)).toBe('unfavourable')
    expect(verdictFor(200)).toBe('catastrophic')
  })
})

describe('full matrix', () => {
  it('pairs every threat against every effector', () => {
    const threats = COST_ENTRIES.filter((c) => c.side === 'threat').length
    const effectors = COST_ENTRIES.filter((c) => c.side === 'effector').length
    expect(allExchanges()).toHaveLength(threats * effectors)
  })

  it('sorts worst exchange first', () => {
    const all = allExchanges()
    expect(all[0].loRatio).toBeGreaterThan(all[all.length - 1].loRatio)
  })

  it('is far more than the three rows the page used to show', () => {
    expect(allExchanges().length).toBeGreaterThan(50)
  })
})

describe('recommendation', () => {
  it('puts near-zero marginal cost effects ahead of every expendable', () => {
    const rec = recommendedAgainst('shahed-136', 3)
    expect(rec).toHaveLength(3)
    // The three reusable effects share a floor cost, so they legitimately tie on
    // the optimistic ratio. What matters is that all three outrank any round.
    expect(rec.every((r) => r.effector.reusable)).toBe(true)

    const cheapestExpendable = recommendedAgainst('shahed-136', 99)
      .find((r) => !r.effector.reusable)!
    expect(rec[2].loRatio).toBeLessThan(cheapestExpendable.loRatio)
  })

  it('orders expendables by cost once the reusable effects are past', () => {
    const expendables = recommendedAgainst('shahed-136', 99).filter((r) => !r.effector.reusable)
    for (let i = 1; i < expendables.length; i++) {
      expect(expendables[i].loRatio).toBeGreaterThanOrEqual(expendables[i - 1].loRatio)
    }
  })

  it('returns nothing for an unknown threat rather than guessing', () => {
    expect(recommendedAgainst('nope')).toEqual([])
  })
})

describe('formatting', () => {
  it('scales currency to k and M', () => {
    expect(formatUsd(500)).toBe('$500')
    expect(formatUsd(35_000)).toBe('$35k')
    expect(formatUsd(4_200_000)).toBe('$4.2M')
  })

  it('formats ratios readably at both extremes', () => {
    expect(formatRatio(0.004)).toBe('<0.01:1')
    expect(formatRatio(0.5)).toBe('0.50:1')
    expect(formatRatio(3.4)).toBe('3.4:1')
    expect(formatRatio(212.7)).toBe('213:1')
  })
})
