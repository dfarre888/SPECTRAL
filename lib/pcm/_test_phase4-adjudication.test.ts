/**
 * SPECTRAL PCM Phase 4 — Full adjudication engine tests
 */

import { describe, it, expect } from 'vitest';
import type { PCM } from '@/lib/pcm/spectral.types';
import { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import { trainingAdjudicationCore } from '@/lib/pcm/trainingAdjudicationCore';
import { advanceThreatPosition } from '@/lib/pcm/threat-kinematics';
import { buildInboundQueue } from '@/lib/pcm/swarm-saturation';
import { gridRef } from '@/lib/pcm/pcm-spectrum-bridge';
import { hashTurnSeed } from '@/lib/pcm/seeded-rng';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import { createSeededRng } from '@/lib/pcm/seeded-rng';

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
    expect(interceptEvents.length).toBeLessThanOrEqual(1);
  });
});
