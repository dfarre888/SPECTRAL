/**
 * Per-turn adjudication context — defeat matrix cache + preloaded pair results.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import type { PcmPairResult } from '@/lib/pcm/pcm-pair-adjudication';

export interface AdjudicationContext {
  defeatMatrix: DefeatMatrixCache;
  pairResults: Map<string, PcmPairResult>;
  tenantId: string | null;
  turnMinutes: number;
  /** Cumulative Red EW pressure reducing Blue intercept Pk this turn (0–1). */
  ewInterceptPenalty: number;
}

export function pairCacheKey(threatId: string, defenderId: string): string {
  return `${threatId}:${defenderId}`;
}

export function getPairResult(
  ctx: AdjudicationContext,
  threat: PCM.Platform,
  defender: PCM.Platform,
): PcmPairResult | undefined {
  return ctx.pairResults.get(pairCacheKey(threat.id, defender.id));
}
