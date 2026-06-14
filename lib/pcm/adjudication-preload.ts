/**
 * Build per-turn adjudication context with defeat matrix + pair preload.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import { preloadPairCache } from '@/lib/pcm/pcm-pair-adjudication';
import { isInboundThreat } from '@/lib/pcm/swarm-saturation';

const DEFENCE_GROUPS = new Set([
  'c_uas_defeat_kinetic',
  'c_uas_defeat_ew',
  'c_uas_defeat_dew',
]);

function isDefenceReady(p: PCM.Platform): boolean {
  return (
    DEFENCE_GROUPS.has(p.group) &&
    p.status !== 'destroyed' &&
    (p.status === 'ground_ready' || p.status === 'airborne_tasked')
  );
}

export async function buildAdjudicationContext(
  supabase: SupabaseClient | null,
  worldState: PCM.WorldState,
  tenantId: string | null,
): Promise<AdjudicationContext> {
  const threats = worldState.red_force.platforms.filter(isInboundThreat);
  const defenders = worldState.blue_force.platforms.filter(isDefenceReady);

  const defeatMatrix = await DefeatMatrixCache.create(
    supabase,
    threats.map((t) => t.type),
    defenders.map((d) => d.type),
  );

  const ctx: AdjudicationContext = {
    defeatMatrix,
    pairResults: new Map(),
    tenantId,
    turnMinutes: 15,
    ewInterceptPenalty: 0,
  };

  await preloadPairCache(ctx, worldState, threats, defenders);
  return ctx;
}
