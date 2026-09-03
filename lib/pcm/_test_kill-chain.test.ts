import { describe, expect, it } from 'vitest'
import {
  resolveKillChain,
  salvoForTarget,
  sensitivity,
  type KillChainStage,
} from '@/lib/pcm/kill-chain'

const stage = (
  id: KillChainStage['id'],
  p: number,
  confidence: KillChainStage['confidence'] = 'osint',
): KillChainStage => ({ id, p, confidence, label: id, basis: `test ${id}` })

const CHAIN = [stage('detect', 0.8), stage('track', 0.9), stage('engage', 0.7), stage('hit', 0.6)]

describe('kill chain', () => {
  it('multiplies conditional stages rather than blending them', () => {
    const r = resolveKillChain({ stages: CHAIN })
    // 0.8 * 0.9 * 0.7 * 0.6
    expect(r.singleShotPk).toBeCloseTo(0.3024, 4)
  })

  it('treats a single shot as the default', () => {
    expect(resolveKillChain({ stages: CHAIN }).salvoSize).toBe(1)
    expect(resolveKillChain({ stages: CHAIN }).cumulativePk).toBeCloseTo(0.3024, 4)
  })

  it('compounds salvo opportunities', () => {
    const r = resolveKillChain({ stages: CHAIN, salvoSize: 3 })
    // 1 - (1 - 0.3024)^3
    expect(r.cumulativePk).toBeCloseTo(1 - Math.pow(1 - 0.3024, 3), 4)
    expect(r.cumulativePk).toBeGreaterThan(r.singleShotPk)
  })

  it('a broken stage kills the chain no matter the salvo', () => {
    const broken = [stage('detect', 0), ...CHAIN.slice(1)]
    const r = resolveKillChain({ stages: broken, salvoSize: 50 })
    expect(r.singleShotPk).toBe(0)
    expect(r.cumulativePk).toBe(0)
    expect(r.limitingStage.id).toBe('detect')
  })

  it('names the limiting stage and says what to do', () => {
    const r = resolveKillChain({ stages: CHAIN })
    expect(r.limitingStage.id).toBe('hit')
    expect(r.finding).toContain('limiting stage')
  })

  it('reports a balanced chain rather than inventing a bottleneck', () => {
    const strong = [stage('detect', 0.98), stage('track', 0.97), stage('hit', 0.99)]
    expect(resolveKillChain({ stages: strong }).finding).toContain('balanced')
  })

  it('takes the worst provenance across stages', () => {
    const mixed = [
      stage('detect', 0.9, 'accredited'),
      stage('track', 0.9, 'osint'),
      stage('hit', 0.9, 'estimated'),
    ]
    expect(resolveKillChain({ stages: mixed }).confidence).toBe('estimated')
  })

  it('widens the band for weaker provenance', () => {
    const acc = resolveKillChain({ stages: CHAIN.map((s) => ({ ...s, confidence: 'accredited' as const })) })
    const est = resolveKillChain({ stages: CHAIN.map((s) => ({ ...s, confidence: 'estimated' as const })) })
    expect(acc.band.hi - acc.band.lo).toBeLessThan(est.band.hi - est.band.lo)
  })

  it('keeps the band inside 0-1', () => {
    const high = resolveKillChain({ stages: [stage('hit', 0.99, 'estimated')] })
    expect(high.band.hi).toBeLessThanOrEqual(1)
    const low = resolveKillChain({ stages: [stage('hit', 0.01, 'estimated')] })
    expect(low.band.lo).toBeGreaterThanOrEqual(0)
  })

  it('clamps out-of-range stage inputs instead of producing nonsense', () => {
    const r = resolveKillChain({ stages: [stage('detect', 1.5), stage('hit', -0.2)] })
    expect(r.singleShotPk).toBe(0)
  })

  it('rejects an empty chain', () => {
    expect(() => resolveKillChain({ stages: [] })).toThrow(/at least one stage/)
  })
})

describe('sensitivity', () => {
  it('ranks stages by what fixing them would buy', () => {
    const s = sensitivity({ stages: CHAIN })
    expect(s[0].stageId).toBe('hit') // weakest stage, biggest gain
    expect(s[0].delta).toBeGreaterThan(s[s.length - 1].delta)
  })

  it('shows a perfect stage as worth nothing to improve', () => {
    const s = sensitivity({ stages: [stage('detect', 1), stage('hit', 0.5)] })
    const detect = s.find((x) => x.stageId === 'detect')!
    expect(detect.delta).toBeCloseTo(0, 6)
  })

  it('accounts for salvo when ranking', () => {
    const single = sensitivity({ stages: CHAIN })
    const salvo = sensitivity({ stages: CHAIN, salvoSize: 4 })
    // With more shots the marginal value of any one fix is smaller.
    expect(salvo[0].delta).toBeLessThan(single[0].delta)
  })
})

describe('salvo sizing', () => {
  it('finds the shots needed to reach a target', () => {
    // Pss 0.3, target 0.9 -> ceil(ln0.1 / ln0.7) = 7
    expect(salvoForTarget(0.3, 0.9)).toBe(7)
  })

  it('needs one shot when the target is already met', () => {
    expect(salvoForTarget(0.95, 0.5)).toBe(1)
  })

  it('returns null when the target is unreachable', () => {
    expect(salvoForTarget(0, 0.5)).toBeNull()
    expect(salvoForTarget(0.5, 1)).toBeNull()
  })
})
