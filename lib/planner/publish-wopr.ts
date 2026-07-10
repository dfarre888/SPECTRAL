/**
 * Publish battlespace plan → WOPR scenario world state
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import 'server-only';
import { refreshScenarioPropagation } from '@/lib/wopr/propagation-refresh';
import { createDefaultWorldState } from '@/lib/wopr/engine';
import type { BattlespacePlanRow } from '@/lib/planner/battlespace-plan';
import { getVignette } from '@/lib/planner/vignettes';
import type { MapAssetsPayload } from '@/lib/map/types';
import type { WorldState, WoprPlatform } from '@/lib/wopr/types';

function buildNameLookup(catalog?: MapAssetsPayload): Map<string, string> {
  const map = new Map<string, string>();
  if (!catalog) return map;
  for (const list of [catalog.uas, catalog.cuas, catalog.radars, catalog.effectors]) {
    for (const asset of list ?? []) {
      map.set(asset.id, asset.name);
    }
  }
  return map;
}

function resolveName(lookup: Map<string, string>, assetId: string): string {
  return lookup.get(assetId) ?? assetId;
}

function toWoprPlatform(
  instanceId: string,
  assetId: string,
  name: string,
  lon: number,
  lat: number,
  alt_m: number,
  side: 'red' | 'blue',
): WoprPlatform {
  return {
    id: instanceId,
    name,
    lat,
    lon,
    alt_m,
    side,
    platform_type: assetId,
    radiating: side === 'blue',
    destroyed: false,
  };
}

export function planToWorldState(plan: BattlespacePlanRow, catalog?: MapAssetsPayload): WorldState {
  const world = createDefaultWorldState();
  const laydown = plan.laydown;
  const names = buildNameLookup(catalog);

  for (const u of laydown.uas ?? []) {
    world.red_orbat.platforms.push(
      toWoprPlatform(
        u.instanceId,
        u.assetId,
        resolveName(names, u.assetId),
        u.lon,
        u.lat,
        u.discAltitude_m ?? 100,
        'red',
      ),
    );
  }
  for (const c of laydown.cuas ?? []) {
    world.blue_orbat.platforms.push(
      toWoprPlatform(
        c.instanceId,
        c.assetId,
        resolveName(names, c.assetId),
        c.lon,
        c.lat,
        c.terrainAMSL + 5,
        'blue',
      ),
    );
  }
  for (const r of laydown.radars ?? []) {
    world.blue_orbat.platforms.push(
      toWoprPlatform(
        r.instanceId,
        r.assetId,
        resolveName(names, r.assetId),
        r.lon,
        r.lat,
        r.terrainAMSL + 10,
        'blue',
      ),
    );
  }
  for (const e of laydown.effectors ?? []) {
    world.blue_orbat.platforms.push(
      toWoprPlatform(
        e.instanceId,
        e.assetId,
        resolveName(names, e.assetId),
        e.lon,
        e.lat,
        e.terrainAMSL + 5,
        'blue',
      ),
    );
  }

  const vignette = plan.vignette_id ? getVignette(plan.vignette_id) : undefined;
  if (vignette?.terrain === 'coastal_gbad') {
    world.battlespace.terrain = 'coastal_gbad';
    world.battlespace.weather.visibility_km = 15;
  }

  return world;
}

export async function publishPlanToWopr(
  plan: BattlespacePlanRow,
  tenantId: string,
  catalog?: MapAssetsPayload,
): Promise<{ worldState: WorldState; propagationEvents: string[] }> {
  const worldState = planToWorldState(plan, catalog);
  const { cache, events } = await refreshScenarioPropagation(worldState, tenantId);
  worldState.propagation_cache = cache;
  return { worldState, propagationEvents: events };
}
