import { describe, expect, it } from 'vitest'
import { buildGapReport, gapHeadline, scoreGap, type GapSourceRow } from '@/lib/force-catalog/data-gaps'

const row = (over: Partial<GapSourceRow> = {}): GapSourceRow => ({
  id: 'AUS-CAT-X', short_name: 'X', domain: 'air', role: 'transport',
  force_side: 'blue', sensors: [{}], comms: [{}], ...over,
})

describe('gap scoring', () => {
  it('ignores a fully specified platform', () => {
    expect(scoreGap(row())).toBeNull()
  })

  it('flags a missing sensor fit', () => {
    const g = scoreGap(row({ sensors: [] }))!
    expect(g.kind).toBe('sensors')
    expect(g.reasons[0]).toContain('No sensors fit')
  })

  it('flags a record with nothing at all', () => {
    const g = scoreGap(row({ sensors: [], comms: [] }))!
    expect(g.kind).toBe('both')
    expect(g.reasons.some((r) => r.includes('Nothing recorded'))).toBe(true)
  })

  it('scores an air-defence radar above a transport', () => {
    const sam = scoreGap(row({ sensors: [], role: 'sam' }))!
    const transport = scoreGap(row({ sensors: [] }))!
    expect(sam.priority).toBeGreaterThan(transport.priority)
    expect(sam.reasons.some((r) => r.includes('threat assessment'))).toBe(true)
  })

  it('scores a Red gap above the same Blue gap', () => {
    const red = scoreGap(row({ sensors: [], force_side: 'red' }))!
    const blue = scoreGap(row({ sensors: [] }))!
    expect(red.priority).toBeGreaterThan(blue.priority)
    expect(red.reasons.some((r) => r.includes('understates the threat'))).toBe(true)
  })

  it('penalises a partially specified record for looking complete', () => {
    const partial = scoreGap(row({ sensors: [] }))!
    expect(partial.reasons.some((r) => r.includes('reads as complete'))).toBe(true)
  })

  it('weights air above ground for the same gap', () => {
    const air = scoreGap(row({ sensors: [], domain: 'air' }))!
    const ground = scoreGap(row({ sensors: [], domain: 'ground' }))!
    expect(air.priority).toBeGreaterThan(ground.priority)
  })

  it('keeps priority inside 0-100', () => {
    const worst = scoreGap(row({ sensors: [], comms: [], role: 'sam', force_side: 'red', domain: 'air' }))!
    expect(worst.priority).toBeGreaterThan(0)
    expect(worst.priority).toBeLessThanOrEqual(100)
  })

  it('derives nation from the id prefix', () => {
    expect(scoreGap(row({ id: 'CHN-CAT-9', sensors: [] }))!.nation).toBe('CHN')
  })
})

describe('gap report', () => {
  const rows: GapSourceRow[] = [
    row({ id: 'AUS-1' }),
    row({ id: 'AUS-2', sensors: [] }),
    row({ id: 'RUS-1', sensors: [], comms: [], role: 'sam', force_side: 'red' }),
    row({ id: 'RUS-2', domain: 'ground', sensors: [] }),
  ]

  it('counts and ranks gaps', () => {
    const r = buildGapReport(rows)
    expect(r.totalPlatforms).toBe(4)
    expect(r.gapPlatforms).toBe(3)
    expect(r.gapPct).toBe(75)
    // The Red SAM with nothing recorded must lead.
    expect(r.ranked[0].id).toBe('RUS-1')
  })

  it('breaks down by domain and nation', () => {
    const r = buildGapReport(rows)
    expect(r.byNation.find((n) => n.nation === 'RUS')!.gaps).toBe(2)
    expect(r.byDomain.find((d) => d.domain === 'air')!.total).toBe(3)
  })

  it('handles an empty catalogue', () => {
    const r = buildGapReport([])
    expect(r.gapPct).toBe(0)
    expect(r.ranked).toEqual([])
  })

  it('states the gap plainly in one line', () => {
    const h = gapHeadline(buildGapReport(rows))
    expect(h).toContain('3 of 4')
    expect(h).toContain('75%')
  })
})
