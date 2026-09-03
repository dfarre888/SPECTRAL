import { describe, expect, it } from 'vitest'
import { killChainFromPairResult } from '@/lib/pcm/kill-chain-bridge'
import type { PcmPairResult } from '@/lib/pcm/pcm-pair-adjudication'

function pair(over: Partial<PcmPairResult> = {}): PcmPairResult {
  return {
    combinedBlueSuccessPct: 50,
    spectrumVerdict: 'partial',
    inRange: true,
    isImmune: false,
    immuneReason: null,
    propagationGated: false,
    defeatMatrixPk: 70,
    data_source: 'osint',
    ...over,
  } as PcmPairResult
}

describe('kill chain from pair result', () => {
  it('produces four named stages', () => {
    const r = killChainFromPairResult(pair())
    expect(r.stages.map((s) => s.id)).toEqual(['detect', 'track', 'engage', 'hit'])
  })

  it('zeroes the chain when the target is out of range', () => {
    const r = killChainFromPairResult(pair({ inRange: false }))
    expect(r.cumulativePk).toBe(0)
    expect(r.limitingStage.id).toBe('engage')
    expect(r.limitingStage.basis).toContain('outside')
  })

  it('collapses detection and engagement for an immune target', () => {
    const r = killChainFromPairResult(pair({ isImmune: true, immuneReason: 'fibre-optic control' }))
    expect(r.stages.find((s) => s.id === 'detect')!.p).toBeLessThan(0.1)
    expect(r.cumulativePk).toBeLessThan(0.01)
    expect(r.stages.find((s) => s.id === 'engage')!.basis).toContain('fibre-optic')
  })

  it('degrades tracking when propagation is gated', () => {
    const clear = killChainFromPairResult(pair())
    const gated = killChainFromPairResult(pair({ propagationGated: true }))
    expect(gated.cumulativePk).toBeLessThan(clear.cumulativePk)
    expect(gated.stages.find((s) => s.id === 'track')!.basis).toContain('Propagation gated')
  })

  it('does not let an accredited Pk upgrade the whole chain', () => {
    // Track and Engage remain OSINT stand-ins, so the chain is OSINT even when
    // the Pk itself is accredited. A chain is only as good as its weakest input,
    // and claiming otherwise would overstate the result.
    const acc = killChainFromPairResult(pair({ data_source: 'accredited' }))
    expect(acc.stages.find((s) => s.id === 'hit')!.confidence).toBe('accredited')
    expect(acc.confidence).toBe('osint')
  })

  it('widens the band when any stage falls to estimated', () => {
    const osint = killChainFromPairResult(pair())
    const estimated = killChainFromPairResult(pair({ defeatMatrixPk: null }))
    expect(estimated.band.hi - estimated.band.lo).toBeGreaterThan(osint.band.hi - osint.band.lo)
  })

  it('marks a missing Pk as estimated and widens the band', () => {
    const r = killChainFromPairResult(pair({ defeatMatrixPk: null }))
    expect(r.confidence).toBe('estimated')
    expect(r.stages.find((s) => s.id === 'hit')!.basis).toContain('No Pk on record')
  })

  it('uses the recorded Pk for the effect stage', () => {
    const r = killChainFromPairResult(pair({ defeatMatrixPk: 40 }))
    expect(r.stages.find((s) => s.id === 'hit')!.p).toBeCloseTo(0.4, 6)
  })

  it('compounds a salvo', () => {
    const one = killChainFromPairResult(pair())
    const four = killChainFromPairResult(pair(), { salvoSize: 4 })
    expect(four.cumulativePk).toBeGreaterThan(one.cumulativePk)
  })
})
