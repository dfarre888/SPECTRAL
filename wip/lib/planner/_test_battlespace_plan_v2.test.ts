/**
 * BattlespacePlan document schema v2 tests
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { describe, expect, it } from 'vitest';
import {
  emptyLaydownDocument,
  ensurePlanDocumentV2,
  hydrateLaydown,
  migrateV1ToV2,
  serializeLaydown,
  type MapLaydownDocumentV1,
} from '@/lib/planner/battlespace-plan';
import type { MapAssetsPayload, PlacedUas } from '@/lib/map/types';

const mockUasAsset = {
  id: 'test-uas-1',
  name: 'Test UAS',
  slug: 'test-uas-1',
  category: 'military' as const,
  categoryLabel: 'MALE',
  side: 'blue' as const,
  image_url: null,
  max_altitude_agl_m: 7000,
  altitude_reference: 'AGL' as const,
  max_range_km: 200,
  max_speed_kmh: 220,
  endurance_min: 1440,
  climb_rate_mpm: 300,
};

const mockAssets: MapAssetsPayload = {
  uas: [mockUasAsset],
  cuas: [],
  radars: [],
  effectors: [],
};

const mockPlacedUas: PlacedUas = {
  instanceId: 'inst-1',
  asset: mockUasAsset,
  lon: 133.5,
  lat: -23.7,
  terrainAMSL: 350,
  discAltitude_m: 500,
  lateralRadius_m: 1000,
  ceilingAMSL_m: 850,
  annotationTime_min: 0,
  effectiveRange_km: 50,
  infoPanelClosed: false,
};

describe('BattlespacePlan document v2', () => {
  it('emptyLaydownDocument is version 2', () => {
    expect(emptyLaydownDocument().version).toBe(2);
  });

  it('empty document has empty v2 sections', () => {
    const doc = emptyLaydownDocument();
    expect(doc.coalition.nations).toEqual([]);
    expect(doc.coalition.liaison_embeds).toEqual([]);
    expect(doc.comms.pace_plans).toEqual([]);
    expect(doc.comms.gateway_nodes).toEqual([]);
    expect(doc.airspace.roz).toEqual([]);
    expect(doc.airspace.tanker_tracks).toEqual([]);
    expect(doc.economics.scenarios).toEqual([]);
    expect(doc.economics.exchange_targets).toEqual([]);
    expect(doc.readiness.crew_currency_refs).toEqual([]);
    expect(doc.red_force.platforms).toEqual([]);
  });

  it('migrateV1ToV2 preserves geometry arrays', () => {
    const v1: MapLaydownDocumentV1 = {
      version: 1,
      uas: [
        {
          instanceId: 'u1',
          assetId: 'test-uas-1',
          lon: 133.5,
          lat: -23.7,
          terrainAMSL: 350,
          discAltitude_m: 500,
          lateralRadius_m: 1000,
          ceilingAMSL_m: 850,
          annotationTime_min: 0,
          effectiveRange_km: 50,
        },
      ],
      cuas: [],
      radars: [],
      effectors: [],
      updatedAt: '2026-07-19T00:00:00.000Z',
    };
    const v2 = migrateV1ToV2(v1);
    expect(v2.uas).toEqual(v1.uas);
    expect(v2.cuas).toEqual(v1.cuas);
    expect(v2.radars).toEqual(v1.radars);
    expect(v2.effectors).toEqual(v1.effectors);
  });

  it('migrateV1ToV2 sets version 2', () => {
    const v2 = migrateV1ToV2({
      version: 1,
      uas: [],
      cuas: [],
      radars: [],
      effectors: [],
      updatedAt: '2026-07-19T00:00:00.000Z',
    });
    expect(v2.version).toBe(2);
  });

  it('ensurePlanDocumentV2 is idempotent on v2', () => {
    const doc = emptyLaydownDocument();
    doc.coalition.exercise_id = 'exercise-alpha';
    const once = ensurePlanDocumentV2(doc);
    const twice = ensurePlanDocumentV2(once);
    expect(twice).toEqual(once);
    expect(twice.coalition.exercise_id).toBe('exercise-alpha');
  });

  it('serializeLaydown hydrateLaydown round-trip preserves geometry counts', () => {
    const serialized = serializeLaydown({ placedUas: [mockPlacedUas], placedCuas: [], placedRadars: [], placedEffectors: [] });
    const hydrated = hydrateLaydown(serialized, mockAssets);
    expect(serialized.uas).toHaveLength(1);
    expect(hydrated.placedUas).toHaveLength(1);
    expect(hydrated.placedCuas).toHaveLength(0);
    expect(hydrated.placedRadars).toHaveLength(0);
    expect(hydrated.placedEffectors).toHaveLength(0);
  });

  it('round-trip preserves coalition.exercise_id via existing document merge', () => {
    const existing = emptyLaydownDocument();
    existing.coalition.exercise_id = 'coalition-ex-42';
    const serialized = serializeLaydown(
      { placedUas: [], placedCuas: [], placedRadars: [], placedEffectors: [] },
      existing,
    );
    expect(serialized.coalition.exercise_id).toBe('coalition-ex-42');
    const roundTripped = ensurePlanDocumentV2(serialized);
    expect(roundTripped.coalition.exercise_id).toBe('coalition-ex-42');
  });

  it('v1 document without version field migrates', () => {
    const legacy = {
      uas: [],
      cuas: [],
      radars: [],
      effectors: [],
      updatedAt: '2026-07-19T00:00:00.000Z',
    };
    const v2 = ensurePlanDocumentV2(legacy);
    expect(v2.version).toBe(2);
    expect(v2.red_force.platforms).toEqual([]);
  });

  it('red_force stub defaults', () => {
    const v2 = migrateV1ToV2({
      version: 1,
      uas: [],
      cuas: [],
      radars: [],
      effectors: [],
      updatedAt: '2026-07-19T00:00:00.000Z',
    });
    expect(v2.red_force.platforms).toEqual([]);
    expect(v2.red_force.laydown_offset).toBeNull();
  });

  it('economics.scenarios array round-trip', () => {
    const existing = emptyLaydownDocument();
    existing.economics.scenarios = [
      {
        id: 'econ-1',
        platformId: 'shahed-136',
        defeatSystemId: 'coyote-block-3',
        salvoSize: 2,
        label: 'OWA vs kinetic',
      },
    ];
    const serialized = serializeLaydown(
      { placedUas: [], placedCuas: [], placedRadars: [], placedEffectors: [] },
      existing,
    );
    expect(serialized.economics.scenarios).toHaveLength(1);
    expect(serialized.economics.scenarios[0]?.id).toBe('econ-1');
  });
});
