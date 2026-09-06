import { describe, expect, it } from 'vitest'
import {
  THREAT_CLASSES,
  aggregateCell,
  coveragePct,
  describeCell,
  heatColor,
  heatTextColor,
  median,
  type HeatSample,
} from '@/lib/defeat/heatmap-aggregate'

const s = (pct: number | null, immune = false, confidence = 'high'): HeatSample => ({ pct, immune, confidence })

describe('median', () => {
  it('takes the middle of an odd sample', () => {
    expect(median([10, 90, 50])).toBe(50)
  })
  it('averages the middle pair of an even sample', () => {
    expect(median([10, 20, 30, 40])).toBe(25)
  })
  it('returns null for an empty sample', () => {
    expect(median([])).toBeNull()
  })
  it('is not dragged by an outlier the way a mean would be', () => {
    // Mean would be 32; the typical platform is 10.
    expect(median([10, 10, 10, 100])).toBe(10)
  })
})

describe('cell aggregation', () => {
  it('summarises a class', () => {
    const c = aggregateCell('sys', 'fpv', [s(40), s(60), s(50)])
    expect(c.medianPct).toBe(50)
    expect(c.assessedCount).toBe(3)
    expect(c.totalCount).toBe(3)
  })

  it('excludes immune platforms from the median rather than scoring them zero', () => {
    const c = aggregateCell('sys', 'fpv', [s(60), s(60), s(null, true)])
    // Counting immune as 0 would give 60 -> misleadingly lower.
    expect(c.medianPct).toBe(60)
    expect(c.immuneCount).toBe(1)
    expect(c.totalCount).toBe(3)
  })

  it('distinguishes no assessment from a Pk of zero', () => {
    expect(aggregateCell('s', 'c', [s(null), s(null)]).medianPct).toBeNull()
    expect(aggregateCell('s', 'c', [s(0), s(0)]).medianPct).toBe(0)
  })

  it('takes the weakest provenance in the sample', () => {
    const c = aggregateCell('s', 'c', [s(50, false, 'high'), s(50, false, 'estimated')])
    expect(c.confidence).toBe('estimated')
  })

  it('handles an empty class without dividing by zero', () => {
    const c = aggregateCell('s', 'c', [])
    expect(c.medianPct).toBeNull()
    expect(c.totalCount).toBe(0)
    expect(coveragePct(c)).toBe(0)
  })

  it('reports how much of the class is actually assessed', () => {
    const c = aggregateCell('s', 'c', [s(50), s(null), s(null, true), s(null)])
    // 1 assessed + 1 immune out of 4 = 50%
    expect(coveragePct(c)).toBe(50)
  })
})

describe('colour ramp', () => {
  it('gets hotter as effectiveness rises', () => {
    const ramp = [10, 25, 40, 55, 70, 90].map(heatColor)
    expect(new Set(ramp).size).toBe(6)
  })

  it('gives missing data a neutral, not a low-score colour', () => {
    expect(heatColor(null)).toBe('#15151f')
    expect(heatColor(null)).not.toBe(heatColor(0))
    expect(heatTextColor(null)).toBe('#52525b')
  })

  it('switches text colour for legibility on hot cells', () => {
    expect(heatTextColor(80)).not.toBe(heatTextColor(10))
  })
})

describe('cell description', () => {
  it('says what the number is claiming', () => {
    const c = aggregateCell('sys', 'fpv', [s(50), s(70), s(null, true)])
    const d = describeCell(c, 'DroneGun', 'FPV')
    expect(d).toContain('median Pk')
    expect(d).toContain('of 3 platforms')
    expect(d).toContain('1 immune')
  })

  it('says plainly when nothing is on record', () => {
    const c = aggregateCell('sys', 'fpv', [s(null), s(null)])
    expect(describeCell(c, 'X', 'FPV')).toContain('no assessment on record')
  })

  it('says when the class is empty', () => {
    expect(describeCell(aggregateCell('s', 'c', []), 'X', 'FPV')).toContain('no platforms in class')
  })
})

describe('threat classes', () => {
  it('are few enough to read on one screen', () => {
    expect(THREAT_CLASSES.length).toBeLessThanOrEqual(8)
  })
  it('have unique ids and short labels for narrow columns', () => {
    const ids = THREAT_CLASSES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of THREAT_CLASSES) expect(c.short.length).toBeLessThanOrEqual(6)
  })
})
