/**
 * Map Intel laydown session → PCM adjudication pair cache pre-seed.
 */

import { readLaydownSession, type LaydownSession, type LaydownSessionPair } from '@/lib/map/laydown-session';
import { sessionPairToPcmPairResult } from '@/lib/map/map-adjudication-provenance';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';

export function readLaydownSessionSafe(): LaydownSession | null {
  if (typeof window === 'undefined') return null;
  return readLaydownSession();
}

export function mergeLaydownIntoContext(
  ctx: AdjudicationContext,
  session: LaydownSession | null,
): void {
  if (!session?.pairs?.length) return;
  for (const pair of session.pairs) {
    const key = `${pair.uasInstanceId}:${pair.cuasInstanceId}`;
    if (!ctx.pairResults.has(key)) {
      ctx.pairResults.set(key, sessionPairToPcmPairResult(pair));
    }
  }
}
