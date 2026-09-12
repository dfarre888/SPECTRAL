import { describe, expect, it } from 'vitest'
import { GLOSS_BUDGET, allocateGloss, glossClass } from '@/lib/ui/gloss-budget'

const c = (key: string, weight: number, eligible = true) => ({ key, weight, eligible })

describe('gloss budget', () => {
  it('holds to Dark Frame’s two or three per screen', () => {
    expect(GLOSS_BUDGET).toBeGreaterThanOrEqual(2)
    expect(GLOSS_BUDGET).toBeLessThanOrEqual(3)
  })

  it('leaves a screen with no attention state entirely matte', () => {
    // This is the case that makes the treatment mean something.
    expect(allocateGloss([c('a', 9, false), c('b', 5, false)]).size).toBe(0)
  })

  it('spends the budget on the highest weights', () => {
    const got = allocateGloss([c('low', 1), c('high', 9), c('mid', 5)])
    expect([...got].sort()).toEqual(['high', 'mid'])
  })

  it('never exceeds the budget however much is wrong at once', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((k, i) => c(k, i))
    expect(allocateGloss(many).size).toBe(GLOSS_BUDGET)
  })

  it('ignores ineligible elements even when they outrank everything', () => {
    const got = allocateGloss([c('quiet', 100, false), c('loud', 1, true)])
    expect([...got]).toEqual(['loud'])
  })

  it('breaks ties on caller order rather than arbitrarily', () => {
    const got = allocateGloss([c('first', 5), c('second', 5), c('third', 5)], 2)
    expect([...got].sort()).toEqual(['first', 'second'])
  })

  it('honours a caller-supplied budget, including zero', () => {
    expect(allocateGloss([c('a', 1), c('b', 2)], 1).size).toBe(1)
    expect(allocateGloss([c('a', 1)], 0).size).toBe(0)
  })

  it('handles an empty candidate list', () => {
    expect(allocateGloss([]).size).toBe(0)
  })

  it('returns the matte class when gloss is not allocated', () => {
    expect(glossClass(false, 'store-panel')).toBe('store-panel')
    expect(glossClass(true, 'store-panel')).toContain('gloss-tile')
    expect(glossClass(true, 'store-panel')).not.toContain('store-panel')
  })
})
