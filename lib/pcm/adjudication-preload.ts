/**
 * Build per-turn adjudication context with defeat matrix + pair preload.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import { preloadPairCache } from '@/lib/pcm/pcm-pair-adjudication';
import { isInboundThreat } from '@/lib/pcm/swarm-saturation';
import { mergeLaydownIntoContext, readLaydownSessionSafe } from '@/lib/pcm/laydown-context-bridge';
import type { AccreditedDataLayer } from '@/lib/pcm/accredited-data-layer';
import { buildAccreditedDataLayer } from '@/lib/pcm/accredited-data-layer';
import { fetchAccreditedErpProfiles } from '@/lib/operations/accredited-supplements';
import type { AccreditedErpProfile } from '@/lib/operations/accredited-supplements-data';
import { resolvePcmPlatformId, resolveDefenderSystemId } from '@/lib/pcm/pcm-platform-ids';
import { fetchGnssPlatformDependencies } from '@/lib/gnss/gnss-queries';
import type { GnssPlatformDependency } from '@/lib/gnss/gnss-types';
import { countGnssDependentThreats } from '@/lib/pcm/gnss-adjudication-bridge';


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


export async function preloadAccreditedData(
  worldState: PCM.WorldState,
): Promise<AccreditedDataLayer | undefined> {
  if (process.env.SPECTRAL_ACCREDITED_RESOLVER !== 'true') return undefined;

  const threats = worldState.red_force.platforms.filter(isInboundThreat);
  const defenders = worldState.blue_force.platforms.filter(isDefenceReady);
  if (!threats.length || !defenders.length) return undefined;

  const platformIds = [
    ...new Set(
      threats
        .map((t) => resolvePcmPlatformId(t.type))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const defeatSystemIds = [
    ...new Set(defenders.map((d) => resolveDefenderSystemId(d.type, d.group))),
  ];
  if (!platformIds.length || !defeatSystemIds.length) return undefined;

  const catalogMap = await buildAccreditedDataLayer(platformIds, defeatSystemIds);
  if (catalogMap.size === 0) return undefined;

  const instanceMap: AccreditedDataLayer = new Map();
  for (const threat of threats) {
    const pid = resolvePcmPlatformId(threat.type);
    if (!pid) continue;
    for (const defender of defenders) {
      const sid = resolveDefenderSystemId(defender.type, defender.group);
      const row = catalogMap.get(`${pid}:${sid}`);
      if (row) instanceMap.set(`${threat.id}:${defender.id}`, row);
    }
  }

  return instanceMap.size > 0 ? instanceMap : undefined;
}


export async function preloadAccreditedErpRows(): Promise<AccreditedErpProfile[] | undefined> {
  if (process.env.SPECTRAL_ACCREDITED_RESOLVER !== 'true') return undefined;
  const rows = await fetchAccreditedErpProfiles();
  return rows.length > 0 ? rows : undefined;
}

async function preloadGnssDependencies(): Promise<GnssPlatformDependency[]> {
  if (process.env.SPECTRAL_ACCREDITED_RESOLVER !== 'true') return [];
  return fetchGnssPlatformDependencies();
}

export async function buildAdjudicationContext(
  supabase: SupabaseClient | null,
  worldState: PCM.WorldState,
  tenantId: string | null,
  accreditedData?: AccreditedDataLayer,
  accreditedErpRows?: AccreditedErpProfile[],
): Promise<AdjudicationContext> {
  const threats = worldState.red_force.platforms.filter(isInboundThreat);
  const defenders = worldState.blue_force.platforms.filter(isDefenceReady);

  const defeatMatrix = await DefeatMatrixCache.create(
    supabase,
    threats.map((t) => t.type),
    defenders.map((d) => d.type),
    tenantId,
  );

  const [resolvedAccredited, resolvedErpRows, gnssRows] = await Promise.all([
    accreditedData ?? preloadAccreditedData(worldState),
    accreditedErpRows ?? preloadAccreditedErpRows(),
    preloadGnssDependencies(),
  ]);

  const threatIds = [
    ...new Set(
      threats
        .map((t) => resolvePcmPlatformId(t.type))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const ctx: AdjudicationContext = {
    defeatMatrix,
    pairResults: new Map(),
    tenantId,
    turnMinutes: 15,
    ewInterceptPenalty: 0,
    accreditedData: resolvedAccredited,
    accreditedErpRows: resolvedErpRows,
    gnssDependencies: gnssRows.length > 0 ? gnssRows : undefined,
    gnssSwarmDegradedCount:
      gnssRows.length > 0
        ? countGnssDependentThreats(threatIds, gnssRows, true)
        : undefined,
  };

  await preloadPairCache(ctx, worldState, threats, defenders);
  mergeLaydownIntoContext(ctx, readLaydownSessionSafe());
  return ctx;
}
