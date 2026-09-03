/**
 * Kill chain resolution.
 *
 * The existing combinedScore() blends a Pk, a 0-90 spectrum heuristic and a jam
 * bonus with fixed weights (0.4 / 0.35 / 0.25). The output looks like a
 * percentage but is not one: you cannot multiply a verdict heuristic by 0.35 and
 * defend the result as a probability of kill.
 *
 * This models the engagement the way it actually happens — as a chain of
 * conditional stages, each a real probability:
 *
 *     P(kill) = P(detect) x P(track | detect) x P(engage | track) x P(hit | engage)
 *
 * Three consequences matter more than the arithmetic:
 *
 *   1. The result is interpretable. 0.28 means 28 engagements in 100 end in a
 *      kill, not "28 points of blended score".
 *   2. The chain names its own bottleneck. A planner does not want a number,
 *      they want to know which link to attack — and a chain says so directly.
 *   3. Uncertainty propagates. Every stage carries the provenance of its input,
 *      and the weakest provenance sets the width of the reported band.
 *
 * This module deliberately does not replace combinedScore. It is additive, so
 * the existing engine and its tests stay intact while the two can be compared.
 */

export type StageId = 'detect' | 'track' | 'engage' | 'hit'

/** Provenance of a stage probability, worst-case wins when combined. */
export type StageConfidence = 'accredited' | 'osint' | 'estimated'

export interface KillChainStage {
  id: StageId
  label: string
  /** Conditional probability of this stage succeeding, 0-1. */
  p: number
  /** Where the number came from — shown to the user, never hidden. */
  basis: string
  confidence: StageConfidence
}

export interface KillChainInput {
  stages: KillChainStage[]
  /** Engagement opportunities available. 1 = single shot. */
  salvoSize?: number
}

export interface KillChainResult {
  stages: KillChainStage[]
  /** Product of all stage probabilities, 0-1. */
  singleShotPk: number
  salvoSize: number
  /** 1 - (1 - Pss)^n, 0-1. */
  cumulativePk: number
  /** Lowest-probability stage — the link to attack. */
  limitingStage: KillChainStage
  /** Worst provenance across stages. */
  confidence: StageConfidence
  /** Uncertainty band on cumulativePk, width set by provenance. */
  band: { lo: number; hi: number }
  /** Plain statement of what dominates and what to do about it. */
  finding: string
}

/**
 * Band half-width by provenance.
 *
 * These are honesty margins, not measured error bars: they express how much a
 * figure of this provenance should be trusted, so a chain resting on estimated
 * inputs cannot present a falsely precise answer. Accredited inputs still carry
 * a margin because the chain composition is itself a model.
 */
const BAND_HALF_WIDTH: Record<StageConfidence, number> = {
  accredited: 0.05,
  osint: 0.12,
  estimated: 0.22,
}

const CONFIDENCE_RANK: Record<StageConfidence, number> = {
  accredited: 0,
  osint: 1,
  estimated: 2,
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function resolveKillChain(input: KillChainInput): KillChainResult {
  const stages = input.stages
  if (stages.length === 0) throw new Error('kill chain requires at least one stage')

  const salvoSize = Math.max(1, Math.floor(input.salvoSize ?? 1))

  const singleShotPk = clamp01(stages.reduce((acc, s) => acc * clamp01(s.p), 1))
  const cumulativePk = clamp01(1 - Math.pow(1 - singleShotPk, salvoSize))

  const limitingStage = stages.reduce((worst, s) => (s.p < worst.p ? s : worst), stages[0])

  const confidence = stages.reduce<StageConfidence>(
    (worst, s) => (CONFIDENCE_RANK[s.confidence] > CONFIDENCE_RANK[worst] ? s.confidence : worst),
    'accredited',
  )

  const half = BAND_HALF_WIDTH[confidence]
  const band = { lo: clamp01(cumulativePk - half), hi: clamp01(cumulativePk + half) }

  const pct = (n: number) => Math.round(n * 100)
  const finding =
    limitingStage.p >= 0.95
      ? `No single stage is limiting; the chain is balanced at ${pct(cumulativePk)}%.`
      : `${limitingStage.label} is the limiting stage at ${pct(limitingStage.p)}%. ` +
        `Raising it is worth more than improving any other link.`

  return {
    stages,
    singleShotPk,
    salvoSize,
    cumulativePk,
    limitingStage,
    confidence,
    band,
    finding,
  }
}

/**
 * Marginal value of fixing each stage.
 *
 * Answers "what should be used and when" quantitatively: for each stage, the
 * cumulative Pk that would result if that stage alone were raised to near
 * certainty. The largest delta is where effort belongs.
 */
export interface StageSensitivity {
  stageId: StageId
  label: string
  current: number
  /** Cumulative Pk if this stage were perfect. */
  ifPerfect: number
  /** Gain in cumulative Pk, 0-1. */
  delta: number
}

export function sensitivity(input: KillChainInput): StageSensitivity[] {
  const base = resolveKillChain(input)
  return input.stages
    .map((s) => {
      const lifted = resolveKillChain({
        ...input,
        stages: input.stages.map((x) => (x.id === s.id ? { ...x, p: 1 } : x)),
      })
      return {
        stageId: s.id,
        label: s.label,
        current: s.p,
        ifPerfect: lifted.cumulativePk,
        delta: lifted.cumulativePk - base.cumulativePk,
      }
    })
    .sort((a, b) => b.delta - a.delta)
}

/**
 * Salvo size needed to reach a target cumulative Pk.
 *
 * Returns null when the target is unreachable at any salvo size — which happens
 * whenever a stage is zero, and is a more useful answer than a large number.
 */
export function salvoForTarget(singleShotPk: number, target: number): number | null {
  const p = clamp01(singleShotPk)
  const t = clamp01(target)
  if (p <= 0) return null
  if (t <= 0) return 1
  if (t >= 1) return null
  return Math.ceil(Math.log(1 - t) / Math.log(1 - p))
}
