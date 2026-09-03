/**
 * Builds a kill chain from the inputs the pair adjudicator already computes.
 *
 * Nothing new is measured here — the same spectrum verdict, propagation gate,
 * range check and Pk that feed combinedScore() are re-expressed as conditional
 * stages. The point is interpretability: the same evidence, arranged so it can
 * be reasoned about and argued with.
 */

import type { PcmPairResult } from '@/lib/pcm/pcm-pair-adjudication'
import {
  resolveKillChain,
  type KillChainResult,
  type KillChainStage,
  type StageConfidence,
} from '@/lib/pcm/kill-chain'

export interface KillChainBridgeOptions {
  /** Engagement opportunities in the window under assessment. */
  salvoSize?: number
}

/**
 * Detection probability from the spectrum verdict.
 *
 * These are OSINT-descriptive stand-ins for a sensor model, not measured
 * detection ranges. They are ordered and documented so the assumption is
 * visible rather than buried in a weighted sum.
 */
const DETECT_P: Record<string, number> = {
  defeat_likely: 0.95,
  partial: 0.8,
  detect_only: 0.7,
  no_engagement: 0.35,
  kinetic_only: 0.6,
}

function detectProbability(verdict: string, coverage: number | undefined): number {
  const base = DETECT_P[verdict] ?? 0.5
  // Effective coverage refines the verdict where the spectrum engine supplied it.
  if (typeof coverage === 'number' && Number.isFinite(coverage)) {
    return Math.max(0.05, Math.min(0.99, base * (0.6 + 0.4 * Math.max(0, Math.min(1, coverage)))))
  }
  return base
}

export function killChainFromPairResult(
  result: PcmPairResult,
  opts: KillChainBridgeOptions = {},
): KillChainResult {
  const confidence: StageConfidence =
    result.data_source === 'accredited' ? 'accredited' : result.defeatMatrixPk === null ? 'estimated' : 'osint'

  const coverage = result.spectrum?.effectiveCoverage
  const verdict = result.spectrumVerdict ?? 'no_engagement'

  const detectP = result.isImmune ? 0.05 : detectProbability(verdict, coverage)

  // Tracking is where terrain and propagation bite: a contact you cannot hold
  // is not a track, and an RF effector gated by propagation cannot maintain one.
  const trackP = result.propagationGated ? 0.45 : 0.9

  // Engagement is gated hard by range and immunity — these are pass/fail, not
  // soft factors, and modelling them as such is more honest than a multiplier.
  const engageP = !result.inRange ? 0 : result.isImmune ? 0.05 : 0.9

  // Hit uses the actual Pk when there is one. Where no Pk exists the stage is
  // explicitly estimated, which widens the reported band rather than pretending.
  const hitP = result.defeatMatrixPk !== null ? Math.max(0, Math.min(1, result.defeatMatrixPk / 100)) : 0.4

  const stages: KillChainStage[] = [
    {
      id: 'detect',
      label: 'Detect',
      p: detectP,
      basis: result.isImmune
        ? `Target immune: ${result.immuneReason ?? 'no effective sensor path'}`
        : `Spectrum verdict '${verdict}'${coverage !== undefined ? ` at ${Math.round(coverage * 100)}% coverage` : ''}`,
      confidence: result.data_source === 'accredited' ? 'accredited' : 'osint',
    },
    {
      id: 'track',
      label: 'Track',
      p: trackP,
      basis: result.propagationGated
        ? 'Propagation gated — terrain or path loss degrades track hold'
        : 'Clear propagation path',
      confidence: 'osint',
    },
    {
      id: 'engage',
      label: 'Engage',
      p: engageP,
      basis: !result.inRange
        ? 'Target outside effector envelope'
        : result.isImmune
          ? `Immune: ${result.immuneReason ?? 'hardened against this effect'}`
          : 'Within envelope, engagement authorised',
      confidence: 'osint',
    },
    {
      id: 'hit',
      label: 'Effect',
      p: hitP,
      basis:
        result.defeatMatrixPk !== null
          ? `Pk ${result.defeatMatrixPk}% from ${result.data_source ?? 'osint'} layer`
          : 'No Pk on record — stage estimated, band widened accordingly',
      confidence: result.defeatMatrixPk !== null ? confidence : 'estimated',
    },
  ]

  return resolveKillChain({ stages, salvoSize: opts.salvoSize })
}
