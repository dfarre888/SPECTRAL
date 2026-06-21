import { describe, it, expect } from 'vitest'
import {
  kineticPctFromSam,
  isSamSystemId,
  getSamSystemGroup,
  SAM_MATRIX_PLATFORMS,
  platformToUasCategory,
} from '@/lib/defeat/sam-matrix-bridge'
import { resolveSamKineticPct } from '@/lib/defeat/resolve-sam-pk'

describe('isSamSystemId', () => {
  it('recognises sa-* and pantsir-s1-cuas', () => {
    expect(isSamSystemId('sa-15-gauntlet')).toBe(true)
    expect(isSamSystemId('pantsir-s1-cuas')).toBe(true)
    expect(isSamSystemId('drone-dome')).toBe(false)
  })
})

describe('getSamSystemGroup', () => {
  it('classifies MANPADS and short-range systems', () => {
    expect(getSamSystemGroup('sa-7-grail')).toBe('manpads')
    expect(getSamSystemGroup('sa-15-gauntlet')).toBe('short_range')
    expect(getSamSystemGroup('pantsir-s1-cuas')).toBe('short_range')
    expect(getSamSystemGroup('sa-21-growler')).toBe('long_range')
  })
})

describe('SAM_MATRIX_PLATFORMS', () => {
  it('has nine platforms with category mapping', () => {
    expect(SAM_MATRIX_PLATFORMS).toHaveLength(9)
    expect(platformToUasCategory('shahed-136')).toBe('owa')
    expect(platformToUasCategory('rq-4-global-hawk')).toBe('hale')
  })
})

describe('kineticPctFromSam', () => {
  it('returns reference Pk for SA-15 vs Shahed-136 within envelope', () => {
    const pct = kineticPctFromSam('sa-15-gauntlet', 'shahed-136')
    expect(pct).not.toBeNull()
    expect(pct).toBeGreaterThanOrEqual(55)
    expect(pct).toBeLessThanOrEqual(65)
  })

  it('maps pantsir-s1-cuas to SA-22 profile', () => {
    const pct = kineticPctFromSam('pantsir-s1-cuas', 'shahed-136')
    expect(pct).toBe(kineticPctFromSam('sa-22-greyhound', 'shahed-136'))
  })

  it('returns 0 when HALE exceeds MANPADS ceiling', () => {
    expect(kineticPctFromSam('sa-7-grail', 'rq-4-global-hawk')).toBe(0)
  })

  it('returns null for non-SAM systems', () => {
    expect(kineticPctFromSam('drone-dome', 'fpv-rc')).toBeNull()
  })
})

describe('resolveSamKineticPct', () => {
  it('returns same Pk as kineticPctFromSam for SA-8 vs Shahed-136', () => {
    const expected = kineticPctFromSam('sa-8-gecko', 'shahed-136')
    expect(resolveSamKineticPct('sa-8-gecko', 'shahed-136', 99)).toBe(expected)
  })

  it('returns db value for non-SAM systems', () => {
    expect(resolveSamKineticPct('drone-dome', 'fpv-rc', 75)).toBe(75)
    expect(resolveSamKineticPct('drone-dome', 'fpv-rc', null)).toBeNull()
  })
})
