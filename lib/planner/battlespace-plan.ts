/**
 * SPECTRAL Planner — BattlespacePlan persistence model
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { LaydownSessionPair } from '@/lib/map/laydown-session';
import type {
  MapAssetsPayload,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
  LoiterPlan,
  MissionPlan,
} from '@/lib/map/types';
import type { IadsStackInstance } from '@/lib/planner/iads-stacks';

export type BattlespacePlanPhase = 'plan' | 'rehearse' | 'archived';

export interface PersistedPlacedUas {
  instanceId: string;
  assetId: string;
  lon: number;
  lat: number;
  terrainAMSL: number;
  discAltitude_m: number;
  lateralRadius_m: number;
  ceilingAMSL_m: number;
  annotationTime_min: number;
  effectiveRange_km: number;
  infoPanelClosed?: boolean;
  loiter?: LoiterPlan;
  mission?: MissionPlan;
}

export interface PersistedPlacedCuas {
  instanceId: string;
  assetId: string;
  lon: number;
  lat: number;
  terrainAMSL: number;
  hasTerrainMasking: boolean;
}

export interface PersistedPlacedRadar {
  instanceId: string;
  assetId: string;
  lon: number;
  lat: number;
  terrainAMSL: number;
}

export interface PersistedPlacedEffector {
  instanceId: string;
  assetId: string;
  lon: number;
  lat: number;
  terrainAMSL: number;
}

export interface MapLaydownDocument {
  version: 1;
  uas: PersistedPlacedUas[];
  cuas: PersistedPlacedCuas[];
  radars: PersistedPlacedRadar[];
  effectors: PersistedPlacedEffector[];
  settings?: { nilWind?: boolean; heatmapEnabled?: boolean };
  viewport?: { lon: number; lat: number; height_m?: number };
  updatedAt: string;
}

export interface EconomicsScenarioRef {
  id: string;
  platformId: string;
  defeatSystemId: string;
  salvoSize: number;
  label?: string;
}

export interface BattlespacePlanRow {
  id: string;
  tenant_id: string | null;
  user_id: string;
  name: string;
  classification: string;
  phase: BattlespacePlanPhase;
  vignette_id: string | null;
  laydown: MapLaydownDocument;
  iads_stacks: IadsStackInstance[];
  economics_scenarios: EconomicsScenarioRef[];
  adjudication_pairs: LaydownSessionPair[] | null;
  published_wopr_id: string | null;
  published_pcm_exercise_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaydownState {
  placedUas: PlacedUas[];
  placedCuas: PlacedCuas[];
  placedRadars: PlacedRadar[];
  placedEffectors: PlacedEffector[];
}

function findAsset<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((a) => a.id === id);
}

export function serializeLaydown(state: LaydownState): MapLaydownDocument {
  return {
    version: 1,
    uas: state.placedUas.map((u) => ({
      instanceId: u.instanceId,
      assetId: u.asset.id,
      lon: u.lon,
      lat: u.lat,
      terrainAMSL: u.terrainAMSL,
      discAltitude_m: u.discAltitude_m,
      lateralRadius_m: u.lateralRadius_m,
      ceilingAMSL_m: u.ceilingAMSL_m,
      annotationTime_min: u.annotationTime_min,
      effectiveRange_km: u.effectiveRange_km,
      infoPanelClosed: u.infoPanelClosed,
      loiter: u.loiter,
      mission: u.mission,
    })),
    cuas: state.placedCuas.map((c) => ({
      instanceId: c.instanceId,
      assetId: c.asset.id,
      lon: c.lon,
      lat: c.lat,
      terrainAMSL: c.terrainAMSL,
      hasTerrainMasking: c.hasTerrainMasking,
    })),
    radars: state.placedRadars.map((r) => ({
      instanceId: r.instanceId,
      assetId: r.asset.id,
      lon: r.lon,
      lat: r.lat,
      terrainAMSL: r.terrainAMSL,
    })),
    effectors: state.placedEffectors.map((e) => ({
      instanceId: e.instanceId,
      assetId: e.asset.id,
      lon: e.lon,
      lat: e.lat,
      terrainAMSL: e.terrainAMSL,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function hydrateLaydown(doc: MapLaydownDocument, catalog: MapAssetsPayload): LaydownState {
  const placedUas: PlacedUas[] = [];
  for (const row of doc.uas ?? []) {
    const asset = findAsset(catalog.uas, row.assetId);
    if (!asset) continue;
    placedUas.push({
      instanceId: row.instanceId,
      asset,
      lon: row.lon,
      lat: row.lat,
      terrainAMSL: row.terrainAMSL,
      discAltitude_m: row.discAltitude_m,
      lateralRadius_m: row.lateralRadius_m,
      ceilingAMSL_m: row.ceilingAMSL_m,
      annotationTime_min: row.annotationTime_min,
      effectiveRange_km: row.effectiveRange_km,
      infoPanelClosed: row.infoPanelClosed ?? false,
      loiter: row.loiter,
      mission: row.mission,
    });
  }

  const placedCuas: PlacedCuas[] = [];
  for (const row of doc.cuas ?? []) {
    const asset = findAsset(catalog.cuas, row.assetId);
    if (!asset) continue;
    placedCuas.push({
      instanceId: row.instanceId,
      asset,
      lon: row.lon,
      lat: row.lat,
      terrainAMSL: row.terrainAMSL,
      hasTerrainMasking: row.hasTerrainMasking,
    });
  }

  const placedRadars: PlacedRadar[] = [];
  for (const row of doc.radars ?? []) {
    const asset = findAsset(catalog.radars, row.assetId);
    if (!asset) continue;
    placedRadars.push({
      instanceId: row.instanceId,
      asset,
      lon: row.lon,
      lat: row.lat,
      terrainAMSL: row.terrainAMSL,
    });
  }

  const placedEffectors: PlacedEffector[] = [];
  for (const row of doc.effectors ?? []) {
    const asset = findAsset(catalog.effectors, row.assetId);
    if (!asset) continue;
    placedEffectors.push({
      instanceId: row.instanceId,
      asset,
      lon: row.lon,
      lat: row.lat,
      terrainAMSL: row.terrainAMSL,
    });
  }

  return { placedUas, placedCuas, placedRadars, placedEffectors };
}

export function emptyLaydownDocument(): MapLaydownDocument {
  return {
    version: 1,
    uas: [],
    cuas: [],
    radars: [],
    effectors: [],
    updatedAt: new Date().toISOString(),
  };
}

const MAX_ENTITIES = 200;
const MAX_LON = 180;
const MIN_LON = -180;
const MAX_LAT = 90;
const MIN_LAT = -90;
const MAX_ALT_M = 50_000;
const MAX_RANGE_KM = 20_000;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function validateCoord(lon: unknown, lat: unknown): string | null {
  if (!isFiniteNumber(lon) || lon < MIN_LON || lon > MAX_LON) return 'invalid longitude';
  if (!isFiniteNumber(lat) || lat < MIN_LAT || lat > MAX_LAT) return 'invalid latitude';
  return null;
}

export function validateMapLaydownDocument(
  doc: unknown,
): { ok: true; value: MapLaydownDocument } | { ok: false; error: string } {
  if (!doc || typeof doc !== 'object') return { ok: false, error: 'laydown must be an object' };
  const d = doc as Record<string, unknown>;
  if (d.version !== 1) return { ok: false, error: 'laydown version must be 1' };

  for (const key of ['uas', 'cuas', 'radars', 'effectors'] as const) {
    if (!Array.isArray(d[key])) return { ok: false, error: `${key} must be an array` };
  }

  const total =
    (d.uas as unknown[]).length +
    (d.cuas as unknown[]).length +
    (d.radars as unknown[]).length +
    (d.effectors as unknown[]).length;
  if (total > MAX_ENTITIES) return { ok: false, error: `laydown exceeds ${MAX_ENTITIES} entities` };

  for (const row of d.uas as Record<string, unknown>[]) {
    const err = validateCoord(row.lon, row.lat);
    if (err) return { ok: false, error: `uas: ${err}` };
    if (isFiniteNumber(row.discAltitude_m) && (row.discAltitude_m < 0 || row.discAltitude_m > MAX_ALT_M)) {
      return { ok: false, error: 'uas: invalid discAltitude_m' };
    }
    if (isFiniteNumber(row.effectiveRange_km) && (row.effectiveRange_km < 0 || row.effectiveRange_km > MAX_RANGE_KM)) {
      return { ok: false, error: 'uas: invalid effectiveRange_km' };
    }
  }

  for (const key of ['cuas', 'radars', 'effectors'] as const) {
    for (const row of d[key] as Record<string, unknown>[]) {
      const err = validateCoord(row.lon, row.lat);
      if (err) return { ok: false, error: `${key}: ${err}` };
      if (isFiniteNumber(row.terrainAMSL) && Math.abs(row.terrainAMSL) > MAX_ALT_M) {
        return { ok: false, error: `${key}: invalid terrainAMSL` };
      }
    }
  }

  return { ok: true, value: doc as MapLaydownDocument };
}
