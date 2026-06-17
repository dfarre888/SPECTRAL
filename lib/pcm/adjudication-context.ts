/**
 * Per-turn adjudication context — defeat matrix cache + preloaded pair results.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import type { PcmPairResult } from '@/lib/pcm/pcm-pair-adjudication';
import type { AccreditedDataLayer } from '@/lib/pcm/accredited-data-layer';
import type { AccreditedErpProfile } from '@/lib/operations/accredited-supplements-data';

export interface AdjudicationContext {
  defeatMatrix: DefeatMatrixCache;
  pairResults: Map<string, PcmPairResult>;
  tenantId: string | null;
  turnMinutes: number;
  /** Cumulative Red EW pressure reducing Blue intercept Pk this turn (0–1). */
  ewInterceptPenalty: number;
  gnssSwarmDegradedCount?: number;
  /**
   * Pre-fetched accredited Pk/Pd rows for this turn.
   * PCM-scoped only — must never flow to learner model or client.
   */
  accreditedData?: AccreditedDataLayer;
  /** Pre-fetched accredited ERP rows for jam/propagation. PCM-scoped only. */
  accreditedErpRows?: AccreditedErpProfile[];
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
