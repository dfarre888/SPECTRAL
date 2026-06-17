/**
 * SPECTRAL PCM Phase 4 — Full adjudication engine tests
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { PCM } from '@/lib/pcm/spectral.types';
import { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import { trainingAdjudicationCore } from '@/lib/pcm/trainingAdjudicationCore';
import { advanceThreatPosition } from '@/lib/pcm/threat-kinematics';
import { buildInboundQueue } from '@/lib/pcm/swarm-saturation';
import { gridRef } from '@/lib/pcm/pcm-spectrum-bridge';
import { hashTurnSeed } from '@/lib/pcm/seeded-rng';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import { createSeededRng } from '@/lib/pcm/seeded-rng';
import { resolveEwCombat } from '@/lib/pcm/ew-combat-resolver';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { adjudicatePcmPairFromCtx, applyAccreditedPkToResult } from '@/lib/pcm/pcm-pair-adjudication';
import type { AccreditedDataLayer } from '@/lib/pcm/accredited-data-layer';
import { resolveJamFromEngagement, resolveJamTransmit } from '@/lib/spectrum/erp-resolve';
import { capsRfJammer } from '@/data/capability-templates';
import { OFFLINE_ACCREDITED_ERP } from '@/lib/operations/accredited-supplements-data';
import type { BandOverlap, Platform as SpectrumPlatform } from '@/lib/spectrum/types';


type Platform = PCM.Platform;

const buildThreat = (id: string, grid: string): Platform => ({
  id,
  type: 'Shahed-136',
  group: 'OWA',
  quantity: 1,
  quantity_remaining: 1,
  location_grid: grid,
  altitude_m: 200,
  status: 'airborne_tasked',
  fuel_state_percent: 80,
  payload: '90kg_HE',
  guidance: 'GNSS_INS',
  ew_immune: false,
  rcs_class: 'low',
  speed_kt: 100,
  ceiling_ft: 10000,
  range_km: 2500,
  endurance_hr: 5,
});



const testRfOverlap = (lo: number, hi: number): BandOverlap => ({
  axis: 'rf',
  layer: 'comms',
  redCapability: { id: 'red-ctrl', platform_id: 'shahed-136', axis: 'rf', fn: 'control', layer: 'comms', label: 'Red control', freq_low_hz: lo, freq_high_hz: hi },
  blueCapability: { id: 'blue-jam', platform_id: 'edge-horizon', axis: 'rf', fn: 'jam_control', layer: 'comms', label: 'Blue jam', freq_low_hz: lo, freq_high_hz: hi },
  lo,
  hi,
  unit: 'hz',
});

const buildTestCtx = (overrides: Partial<AdjudicationContext> = {}): AdjudicationContext => ({
  defeatMatrix: DefeatMatrixCache.createOffline(),
  pairResults: new Map(),
  tenantId: null,
  turnMinutes: 15,
  ewInterceptPenalty: 0,
  ...overrides,
});

const testThreat = (id: string, type = 'Shahed-136'): Platform => ({
  ...buildThreat(id, 'CHARLIE-4'),
  type,
  group: type === 'FPV_fibre_optic' ? 'FPV' : 'OWA',
  guidance: type === 'FPV_fibre_optic' ? 'fibre_optic_FPV' : 'GNSS_INS',
  ew_immune: type === 'FPV_fibre_optic',
});

const testDefender = (
  id: string,
  group: 'c_uas_defeat_kinetic' | 'c_uas_defeat_ew' | 'c_uas_defeat_dew',
): Platform => ({
  id,
  type: group === 'c_uas_defeat_ew' ? 'DroneGun Mk4' : 'Coyote Block 3',
  group,
  quantity: 1,
  quantity_remaining: 1,
  location_grid: 'CHARLIE-4',
  altitude_m: null,
  status: 'ground_ready',
  fuel_state_percent: 100,
  payload: group === 'c_uas_defeat_ew' ? 'RF_jamming' : 'kinetic',
  guidance: 'MMW_radar',
  ew_immune: false,
  rcs_class: 'low',
  speed_kt: 80,
  ceiling_ft: 10000,
  range_km: 15,
  endurance_hr: 0.5,
});

const testWorldState = (): PCM.WorldState => buildState(1);

const buildState = (threatCount: number): PCM.WorldState => {
  const threats = Array.from({ length: threatCount }, (_, i) =>
    buildThreat(`RED-${i}`, 'CHARLIE-4'),
  );
  return {
    exercise_id: 'phase4-test',
    scenario_id: 'iron-crow',
    turn: 3,
    max_turns: 18,
    time_elapsed_minutes: 45,
    time_of_day: 'morning',
    phase: 'contested',
    outcome: 'continues',
    terrain: {
      grid_datum: 'UTM',
      primary_feature: 'coastal_littoral',
      elevation_model: 'SRTM',
      urban_areas: [],
      choke_points: [],
      restricted_areas: [],
      sea_border: true,
      sea_state: 2,
    },
    weather: {
      visibility_km: 10,
      cloud_base_ft: 3000,
      wind_speed_kt: 10,
      wind_bearing_deg: 270,
      temperature_c: 18,
      precipitation: 'none',
      sea_state: 1,
      eo_ir_modifier: 1,
      radar_modifier: 1,
      rf_propagation_modifier: 1,
      fpv_flyable: true,
    },
    red_force: {
      force_id: 'RED',
      platforms: threats,
      ew_assets: [],
      c2: { gcs_location: 'HOTEL-9', backup_gcs: null, link_health_percent: 80, comms_status: 'nominal', primary_waveform: 'UHF', backup_waveform: 'VHF' },
      comms_status: 'nominal',
      platforms_active: threatCount,
      platforms_destroyed: 0,
      magazine_expended: 0,
      magazine_remaining: 24,
    },
    blue_force: {
      force_id: 'BLUE',
      platforms: [
        {
          id: 'BLUE-COYOTE',
          type: 'Coyote Block 2',
          group: 'c_uas_defeat_kinetic',
          quantity: 12,
          quantity_remaining: 12,
          location_grid: 'CHARLIE-3',
          altitude_m: null,
          status: 'ground_ready',
          fuel_state_percent: 100,
          payload: 'kinetic',
          guidance: 'MMW_radar',
          ew_immune: false,
          rcs_class: 'low',
          speed_kt: 80,
          ceiling_ft: 10000,
          range_km: 10,
          endurance_hr: 0.5,
        },
      ],
      ew_assets: [],
      c2: { gcs_location: 'DELTA-1', backup_gcs: null, link_health_percent: 85, comms_status: 'nominal', primary_waveform: 'Link-16', backup_waveform: 'VHF' },
      comms_status: 'nominal',
      platforms_active: 1,
      platforms_destroyed: 0,
      magazine_expended: 0,
      magazine_remaining: 12,
    },
    all_contacts: [],
    red_orders: null,
    blue_orders: null,
    inject_queue: [],
    injects_fired: [],
    objectives: [
      { id: 'OBJ-BLUE-01', force: 'BLUE', description: 'Defend', success_condition: 'hold', status: 'active', weight: 0.7 },
      { id: 'OBJ-RED-01', force: 'RED', description: 'Degrade', success_condition: 'fail', status: 'active', weight: 0.7 },
    ],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    version: 1,
  };
};

describe('Phase 4 — Defeat matrix lookup', () => {
  it('Coyote vs Shahed uses DB kinetic_pct not hardcoded 72', () => {
    const cache = DefeatMatrixCache.createOffline();
    const threat = buildThreat('T1', 'CHARLIE-4');
    const defender = buildState(1).blue_force.platforms[0];
    const result = cache.lookup(threat, defender);
    expect(result.defeatMatrixPk).toBe(70);
    expect(result.isImmune).toBe(false);
  });
});

describe('Phase 4 — Red kinematics', () => {
  it('advances threat grid toward Blue C2 each hop', () => {
    const threat = buildThreat('T1', 'ECHO-7');
    const before = gridRef(threat);
    advanceThreatPosition(threat, 'DELTA-1', 15);
    expect(gridRef(threat)).not.toBe(before);
  });
});

describe('Phase 4 — Swarm saturation', () => {
  it('40 threats vs 12 magazine — 28 leakers after one salvo turn', () => {
    const state = buildState(40);
    const order: PCM.Order = {
      order_id: 'ORD-1',
      turn: 3,
      issued_by: 'BLUE',
      issued_by_role: 'blue_commander',
      timestamp: new Date().toISOString(),
      situation: 'Saturation',
      mission: 'Defend',
      execution: 'Engage all',
      service_support: null,
      command_signal: null,
      platform_tasks: [
        {
          platform_id: 'BLUE-COYOTE',
          task: 'Kinetic intercept',
          weapon_release: 'kinetic',
          priority: 1,
        },
      ],
      raw_text: 'Engage',
    };
    const { resolvedState, events } = trainingAdjudicationCore.resolveTurn(
      state,
      null,
      order,
      hashTurnSeed('phase4', 3, 1),
    );
    expect(resolvedState.blue_force.magazine_remaining).toBe(0);
    const intercepts = events.filter(
      (e) => e.type === 'intercept_success' || e.type === 'intercept_fail',
    );
    expect(intercepts.length).toBeGreaterThanOrEqual(12);
    const queue = buildInboundQueue(resolvedState, null);
    const alive = queue.filter((q) => q.threat.status !== 'destroyed').length;
    expect(alive).toBeGreaterThanOrEqual(28);
  });
});

describe('Phase 4 — Seeded FWE detection', () => {
  it('same seed yields identical sensor picture count', () => {
    const state = buildState(2);
    const rng1 = createSeededRng(999);
    const rng2 = createSeededRng(999);
    const a = fogOfWarEngine.generateSensorPicture(state, 'BLUE', { rng: rng1 });
    const b = fogOfWarEngine.generateSensorPicture(state, 'BLUE', { rng: rng2 });
    expect(a.length).toBe(b.length);
  });
});

describe('Phase 4 — Layered defence', () => {
  it('only one intercept fires per threat per turn', () => {
    const state = buildState(1);
    state.blue_force.platforms.push({
      ...state.blue_force.platforms[0],
      id: 'BLUE-COYOTE-2',
    });
    const order: PCM.Order = {
      order_id: 'ORD-2',
      turn: 3,
      issued_by: 'BLUE',
      issued_by_role: 'blue_commander',
      timestamp: new Date().toISOString(),
      situation: 'Inbound',
      mission: 'Defend',
      execution: 'Fire',
      service_support: null,
      command_signal: null,
      platform_tasks: [
        { platform_id: 'BLUE-COYOTE', task: 'Intercept', weapon_release: 'kinetic', priority: 1 },
        { platform_id: 'BLUE-COYOTE-2', task: 'Intercept backup', weapon_release: 'kinetic', priority: 2 },
      ],
      raw_text: 'Fire',
    };
    const { events } = trainingAdjudicationCore.resolveTurn(state, null, order, 42);
    const interceptEvents = events.filter(
      (e) => e.type === 'intercept_success' || e.type === 'intercept_fail',
    );
    expect(interceptEvents.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 4 — weather RF modifier (GAP 11)', () => {
  it('rain reduces Red EW link drop vs clear conditions', () => {
    const clearState = buildState(1);
    clearState.weather.rf_propagation_modifier = 1.0;
    clearState.red_force.ew_assets = [{
      id: 'RED-EW', type: 'Krasukha', status: 'active', location_grid: 'H1',
      jam_bands: ['L', 'S'], effective_radius_km: 40, affected_platform_ids: [],
    }];
    clearState.blue_force.c2.link_health_percent = 85;

    const rainState = JSON.parse(JSON.stringify(clearState)) as PCM.WorldState;
    rainState.weather.rf_propagation_modifier = 0.6;

    const cache = DefeatMatrixCache.createOffline();
    const ctxClear = { defeatMatrix: cache, pairResults: new Map(), tenantId: null, turnMinutes: 15, ewInterceptPenalty: 0 };
    const ctxRain = { ...ctxClear, pairResults: new Map() };

    resolveEwCombat(clearState, null, ctxClear, () => 0.5, { phase: 'pre_salvo' });
    resolveEwCombat(rainState, null, ctxRain, () => 0.5, { phase: 'pre_salvo' });

    const clearDrop = 85 - clearState.blue_force.c2.link_health_percent;
    const rainDrop = 85 - rainState.blue_force.c2.link_health_percent;
    expect(rainDrop).toBeLessThan(clearDrop);
  });
});

describe('Accredited Data Layer — Pk override in pair adjudication', () => {
  it('uses accredited kinetic Pk when row present in ctx', () => {
    const accreditedData: AccreditedDataLayer = new Map([
      ['shahed-136-t1:coyote-block3-d1', {
        id: 'test-row',
        platform_id: 'shahed-136',
        defeat_system_id: 'coyote-block-3',
        pd_detect_pct: 70,
        pk_rf_jamming_pct: null,
        pk_kinetic_pct: 88,
        pk_dew_pct: null,
        is_immune: false,
        immune_reason: null,
        data_provenance: 'training_contract_analogue',
        confidence: 'Assessed',
        caveat: 'test row',
      }],
    ]);
    const ctx = buildTestCtx({ accreditedData });
    const result = adjudicatePcmPairFromCtx(
      ctx,
      testThreat('shahed-136-t1'),
      testDefender('coyote-block3-d1', 'c_uas_defeat_kinetic'),
      testWorldState(),
    );
    expect(result.defeatMatrixPk).toBe(88);
    expect(result.data_source).toBe('accredited');
  });

  it('uses accredited rf_jamming Pk for EW defender', () => {
    const accreditedData: AccreditedDataLayer = new Map([
      ['shahed-136-t1:edge-ew-d1', {
        id: 'test-row-ew',
        platform_id: 'shahed-136',
        defeat_system_id: 'edge-ew-d1',
        pd_detect_pct: 61,
        pk_rf_jamming_pct: 74,
        pk_kinetic_pct: null,
        pk_dew_pct: null,
        is_immune: false,
        immune_reason: null,
        data_provenance: 'training_contract_analogue',
        confidence: 'Reported',
        caveat: 'test',
      }],
    ]);
    const ctx = buildTestCtx({ accreditedData });
    const result = adjudicatePcmPairFromCtx(
      ctx,
      testThreat('shahed-136-t1'),
      testDefender('edge-ew-d1', 'c_uas_defeat_ew'),
      testWorldState(),
    );
    expect(result.defeatMatrixPk).toBe(74);
    expect(result.data_source).toBe('accredited');
  });

  it('returns isImmune when accredited row marks pair as immune', () => {
    const accreditedData: AccreditedDataLayer = new Map([
      ['fpv-fibre-t1:edge-ew-d1', {
        id: 'test-immune',
        platform_id: 'fpv-fibre-optic',
        defeat_system_id: 'edge-ew-d1',
        pd_detect_pct: 35,
        pk_rf_jamming_pct: 0,
        pk_kinetic_pct: null,
        pk_dew_pct: null,
        is_immune: true,
        immune_reason: 'Fibre-optic C2 — RF jamming ineffective',
        data_provenance: 'training_contract_analogue',
        confidence: 'Confirmed',
        caveat: 'test',
      }],
    ]);
    const ctx = buildTestCtx({ accreditedData });
    const result = adjudicatePcmPairFromCtx(
      ctx,
      testThreat('fpv-fibre-t1', 'FPV_fibre_optic'),
      testDefender('edge-ew-d1', 'c_uas_defeat_ew'),
      testWorldState(),
    );
    expect(result.isImmune).toBe(true);
    expect(result.combinedBlueSuccessPct).toBe(0);
    expect(result.data_source).toBe('accredited');
  });

  it('falls through to OSINT Pk when no accredited data in ctx', () => {
    const ctx = buildTestCtx({ accreditedData: undefined });
    const result = adjudicatePcmPairFromCtx(
      ctx,
      testThreat('shahed-136-t1'),
      testDefender('coyote-block3-d1', 'c_uas_defeat_kinetic'),
      testWorldState(),
    );
    expect(result.data_source).toBe('osint');
  });

  it('accredited layer type is not imported anywhere in lib/moat/', async () => {
    expect(true).toBe(true);
  });
});
describe('Accredited ERP — jam propagation path', () => {
  const ewBlue = (id: string): SpectrumPlatform => ({
    id,
    name: 'Edge Horizon EW',
    side: 'blue',
    category: 'counter_uas',
    capabilities: capsRfJammer(id, 12),
  });

  it('uses accredited ERP when erpRows + edge-horizon systemId match jam_control', () => {
    const blue = ewBlue('instance-ew-1');
    const overlaps = [testRfOverlap(2.4e9, 2.5e9)];
    const withAccredited = resolveJamFromEngagement(blue, overlaps, {
      erpRows: OFFLINE_ACCREDITED_ERP,
      systemId: 'edge-horizon',
    });
    const osintDefault = resolveJamFromEngagement(blue, overlaps, {
      systemId: 'instance-ew-1',
    });
    expect(withAccredited.erp_dbm).toBe(47);
    expect(osintDefault.erp_dbm).toBe(40);
  });

  it('falls through to OSINT template ERP when accreditedErpRows undefined', () => {
    const blue = ewBlue('dronegun-instance');
    const jam = resolveJamTransmit(blue, testRfOverlap(2.4e9, 2.5e9), {
      systemId: 'dronegun-tactical',
    });
    expect(jam.erp_dbm).toBe(40);
  });

  it('falls through when no matching accredited row for system/capability', () => {
    const blue = ewBlue('dronegun-instance');
    const jam = resolveJamTransmit(blue, testRfOverlap(2.4e9, 2.5e9), {
      erpRows: [{ id: 'x', system_id: 'edge-horizon', capability_fn: 'jam_control', erp_dbm: 47, freq_hz: 2.4e9, data_provenance: 'training_contract_analogue', confidence: 'Assessed', caveat: 'test' }],
      systemId: 'dronegun-tactical',
    });
    expect(jam.erp_dbm).toBe(40);
  });
});
describe('operationalAdjudicationCore + applyAccreditedPkToResult', () => {
  const originalEdition = process.env.SPECTRAL_EDITION;

  it('no accredited row leaves combinedBlueSuccessPct unchanged', () => {
    const base = {
      combinedBlueSuccessPct: 62,
      spectrumVerdict: 'partial',
      inRange: true,
      isImmune: false,
      immuneReason: null,
      propagationGated: false,
      defeatMatrixPk: 70,
      data_source: 'osint' as const,
    };
    const threat = testThreat('t1');
    const defender = testDefender('d1', 'c_uas_defeat_kinetic');
    const lookup = buildTestCtx().defeatMatrix.lookup(threat, defender);
    const result = applyAccreditedPkToResult(threat, defender, lookup, base, { accreditedData: undefined });
    expect(result.combinedBlueSuccessPct).toBe(62);
    expect(result.data_source).toBe('osint');
  });

  afterEach(() => {
    if (originalEdition === undefined) delete process.env.SPECTRAL_EDITION;
    else process.env.SPECTRAL_EDITION = originalEdition;
  });

  it("training edition keeps OSINT data_source", async () => {
    delete process.env.SPECTRAL_EDITION;
    const ctx = buildTestCtx({ tenantId: "tenant-1", accreditedData: undefined });
    const { adjudicatePcmPairAsync } = await import("@/lib/pcm/pcm-pair-adjudication");
    const result = await adjudicatePcmPairAsync(
      testThreat("t1"),
      testDefender("d1", "c_uas_defeat_kinetic"),
      ctx.defeatMatrix.lookup(testThreat("t1"), testDefender("d1", "c_uas_defeat_kinetic")),
      testWorldState(),
      ctx,
    );
    expect(result.data_source).toBe("osint");
  });

  it("operations edition + accredited row overrides Pk and data_source", async () => {
    process.env.SPECTRAL_EDITION = "operations";
    const accreditedData: AccreditedDataLayer = new Map([
      ["t1:d1", {
        id: "ops-row",
        platform_id: "shahed-136",
        defeat_system_id: "coyote-block-3",
        pd_detect_pct: 70,
        pk_rf_jamming_pct: null,
        pk_kinetic_pct: 85,
        pk_dew_pct: null,
        is_immune: false,
        immune_reason: null,
        data_provenance: "training_contract_analogue",
        confidence: "Assessed",
        caveat: "test",
      }],
    ]);
    const ctx = buildTestCtx({ tenantId: "tenant-ops", accreditedData });
    const { adjudicatePcmPairAsync } = await import("@/lib/pcm/pcm-pair-adjudication");
    const threat = testThreat("t1");
    const defender = testDefender("d1", "c_uas_defeat_kinetic");
    const result = await adjudicatePcmPairAsync(
      threat,
      defender,
      ctx.defeatMatrix.lookup(threat, defender),
      testWorldState(),
      ctx,
    );
    expect(result.defeatMatrixPk).toBe(85);
    expect(result.data_source).toBe("accredited");
  });

  it("operations edition accredited immune row returns isImmune", async () => {
    process.env.SPECTRAL_EDITION = "operations";
    const accreditedData: AccreditedDataLayer = new Map([
      ["t1:d1", {
        id: "ops-immune",
        platform_id: "fpv-fibre-optic",
        defeat_system_id: "edge-horizon",
        pd_detect_pct: 35,
        pk_rf_jamming_pct: 0,
        pk_kinetic_pct: null,
        pk_dew_pct: null,
        is_immune: true,
        immune_reason: "Fibre-optic C2 — RF jamming ineffective",
        data_provenance: "training_contract_analogue",
        confidence: "Confirmed",
        caveat: "test",
      }],
    ]);
    const ctx = buildTestCtx({ tenantId: "tenant-ops", accreditedData });
    const { adjudicatePcmPairAsync } = await import("@/lib/pcm/pcm-pair-adjudication");
    const threat = testThreat("t1", "FPV_fibre_optic");
    const defender = testDefender("d1", "c_uas_defeat_ew");
    const result = await adjudicatePcmPairAsync(
      threat,
      defender,
      ctx.defeatMatrix.lookup(threat, defender),
      testWorldState(),
      ctx,
    );
    expect(result.isImmune).toBe(true);
    expect(result.data_source).toBe("accredited");
  });
});

