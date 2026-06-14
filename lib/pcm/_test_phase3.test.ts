/**
 * SPECTRAL PCM Phase 3 — REF + Training Adjudication Core
 * Run: npm run test:spectral:phase3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PCM } from '@/lib/pcm/spectral.types';
import { hashTurnSeed, createSeededRng } from '@/lib/pcm/seeded-rng';
import { trainingAdjudicationCore } from '@/lib/pcm/trainingAdjudicationCore';
import {
  placeholderAdjudicationCore,
  composeAdjudicationResult,
} from '@/lib/pcm/adjudicationCore';
import { SpectralRefOrchestrator } from '@/lib/pcm/spectralRefOrchestrator';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';

vi.mock('@/lib/pcm/spectralRefApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/pcm/spectralRefApi')>();
  return {
    ...actual,
    generateRefNarrative: vi.fn().mockResolvedValue({
      reasoning: 'test',
      ds_briefing: 'REF narrative (mocked).',
      blue_suggestion: 'Consider magazine reserve.',
      proposed_inject_id: null,
    }),
  };
});

type WorldState = PCM.WorldState;
type Platform = PCM.Platform;
type Order = PCM.Order;

const mockWeather: PCM.Weather = {
  visibility_km: 10,
  cloud_base_ft: 3000,
  wind_speed_kt: 10,
  wind_bearing_deg: 270,
  temperature_c: 18,
  precipitation: 'none',
  sea_state: 1,
  eo_ir_modifier: 1.0,
  radar_modifier: 1.0,
  rf_propagation_modifier: 1.0,
  fpv_flyable: true,
};

const mockTerrain: PCM.Terrain = {
  grid_datum: 'UTM_zone_54S',
  primary_feature: 'coastal_littoral',
  elevation_model: 'SRTM_30m',
  urban_areas: [],
  choke_points: [],
  restricted_areas: [],
  sea_border: true,
  sea_state: 2,
};

const buildThreat = (overrides: Partial<Platform> = {}): Platform => ({
  id: 'RED-OWA-01',
  type: 'Shahed-136',
  group: 'OWA',
  quantity: 1,
  quantity_remaining: 1,
  location_grid: 'CHARLIE-4',
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
  ...overrides,
});

const buildCoyote = (overrides: Partial<Platform> = {}): Platform => ({
  id: 'BLUE-CUAS-01',
  type: 'Coyote Block 2',
  group: 'c_uas_defeat_kinetic',
  quantity: 12,
  quantity_remaining: 12,
  location_grid: 'CHARLIE-3',
  altitude_m: null,
  status: 'ground_ready',
  fuel_state_percent: 100,
  payload: 'kinetic_warhead',
  guidance: 'MMW_radar',
  ew_immune: false,
  rcs_class: 'low',
  speed_kt: 80,
  ceiling_ft: 10000,
  range_km: 10,
  endurance_hr: 0.5,
  ...overrides,
});

const buildWorldState = (overrides: Partial<WorldState> = {}): WorldState => ({
  exercise_id: 'phase3-test-ex',
  scenario_id: 'iron-crow-001',
  turn: 2,
  max_turns: 18,
  time_elapsed_minutes: 30,
  time_of_day: 'morning',
  phase: 'permissive',
  outcome: 'continues',
  terrain: mockTerrain,
  weather: mockWeather,
  red_force: {
    force_id: 'RED',
    platforms: [buildThreat()],
    ew_assets: [
      {
        id: 'RED-EW-01',
        type: 'Krasukha-4_analogue',
        status: 'active',
        location_grid: 'HOTEL-9',
        jam_bands: ['L', 'S', 'C'],
        effective_radius_km: 40,
        affected_platform_ids: [],
      },
    ],
    c2: {
      gcs_location: 'HOTEL-9',
      backup_gcs: null,
      link_health_percent: 71,
      comms_status: 'degraded_light',
      primary_waveform: 'encrypted_UHF',
      backup_waveform: 'fibre_optic_FPV',
    },
    comms_status: 'degraded_light',
    platforms_active: 1,
    platforms_destroyed: 0,
    magazine_expended: 0,
    magazine_remaining: 24,
  },
  blue_force: {
    force_id: 'BLUE',
    platforms: [buildCoyote()],
    ew_assets: [],
    c2: {
      gcs_location: 'DELTA-1',
      backup_gcs: null,
      link_health_percent: 85,
      comms_status: 'nominal',
      primary_waveform: 'Link-16',
      backup_waveform: 'encrypted_VHF',
    },
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
    {
      id: 'OBJ-BLUE-01',
      force: 'BLUE',
      description: 'Defend logistics node',
      success_condition: 'logistics_node_operational',
      status: 'active',
      weight: 0.7,
    },
  ],
  created_at: '2026-06-01T06:00:00Z',
  updated_at: '2026-06-01T06:30:00Z',
  version: 1,
  ...overrides,
});

const kineticOrder = (platformId: string, targetContactId?: string): Order => ({
  order_id: 'ORD-BLUE-01',
  turn: 2,
  issued_by: 'BLUE',
  issued_by_role: 'blue_commander',
  timestamp: new Date().toISOString(),
  situation: 'Inbound OWA',
  mission: 'Defend node',
  execution: 'Engage threats',
  service_support: null,
  command_signal: null,
  platform_tasks: [
    {
      platform_id: platformId,
      task: 'Kinetic intercept',
      weapon_release: 'coyote_kinetic',
      target_contact_id: targetContactId,
      priority: 1,
    },
  ],
  raw_text: 'Engage',
});

const buildContact = (overrides: Partial<PCM.Contact> = {}): PCM.Contact => ({
  contact_id: 'CNT-01',
  true_platform_id: 'RED-OWA-01',
  detected_by: 'BLUE',
  confidence: 'low',
  classification: 'OWA_possible',
  true_type: 'Shahed-136',
  bearing_deg: 90,
  range_km: 12,
  altitude_m: 200,
  speed_kt: 100,
  detection_method: 'radar',
  detection_probability: 0.02,
  first_detected_turn: 2,
  last_updated_turn: 2,
  time_to_impact_turns: 3,
  location_grid: 'ECHO-7',
  misclassified: false,
  report_delay_turns: 0,
  ...overrides,
});

describe('Phase 3 — Seeded RNG', () => {
  it('same seed produces identical roll sequence', () => {
    const seed = hashTurnSeed('ex-001', 3, 42);
    const a = createSeededRng(seed);
    const b = createSeededRng(seed);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('different turns produce different seeds', () => {
    const s1 = hashTurnSeed('ex-001', 1, 42);
    const s2 = hashTurnSeed('ex-001', 2, 42);
    expect(s1).not.toBe(s2);
  });
});

describe('Phase 3 — Magazine mathematics', () => {
  it('exhausts magazine at 12 intercept attempts', () => {
    const threats = Array.from({ length: 12 }, (_, i) =>
      buildThreat({ id: `RED-OWA-${i + 1}`, location_grid: 'CHARLIE-4' }),
    );
    let state = buildWorldState({
      red_force: {
        ...buildWorldState().red_force,
        platforms: threats,
      },
    });
    const seed = hashTurnSeed(state.exercise_id, state.turn, 99);

    const order = kineticOrder('BLUE-CUAS-01');
    const { resolvedState } = trainingAdjudicationCore.resolveTurn(
      state,
      null,
      order,
      seed,
    );

    expect(resolvedState.blue_force.magazine_remaining).toBe(0);
    expect(resolvedState.blue_force.magazine_expended).toBe(12);
  });

  it('emits intercept_fail when magazine empty', () => {
    const state = buildWorldState({
      blue_force: {
        ...buildWorldState().blue_force,
        magazine_remaining: 0,
        magazine_expended: 12,
      },
    });
    const { events } = trainingAdjudicationCore.resolveTurn(
      state,
      null,
      kineticOrder('BLUE-CUAS-01'),
      12345,
    );
    expect(events.some((e) => e.type === 'intercept_fail')).toBe(true);
    expect(events.some((e) => e.description.toLowerCase().includes('magazine empty'))).toBe(
      true,
    );
  });
});

describe('Phase 3 — Training adjudication core', () => {
  it('emits intercept_success or intercept_fail for kinetic task', () => {
    const state = buildWorldState();
    const seed = hashTurnSeed(state.exercise_id, state.turn, 7);
    const { events } = trainingAdjudicationCore.resolveTurn(
      state,
      null,
      kineticOrder('BLUE-CUAS-01'),
      seed,
    );
    const combatEvents = events.filter(
      (e) => e.type === 'intercept_success' || e.type === 'intercept_fail',
    );
    expect(combatEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('same seed yields deterministic combat outcome', () => {
    const state = buildWorldState();
    const seed = hashTurnSeed(state.exercise_id, state.turn, 777);
    const order = kineticOrder('BLUE-CUAS-01');

    const run1 = trainingAdjudicationCore.resolveTurn(state, null, order, seed);
    const run2 = trainingAdjudicationCore.resolveTurn(state, null, order, seed);

    const types1 = run1.events.map((e) => e.type);
    const types2 = run2.events.map((e) => e.type);
    expect(types1).toEqual(types2);
    expect(run1.resolvedState.red_force.platforms[0].status).toBe(
      run2.resolvedState.red_force.platforms[0].status,
    );
  });

  it('refreshes all_contacts after resolution', () => {
    const state = buildWorldState();
    const { resolvedState } = trainingAdjudicationCore.resolveTurn(
      state,
      null,
      null,
      1,
    );
    expect(resolvedState.all_contacts.length).toBeGreaterThan(0);
  });
});

describe('Phase 3 — IRON CROW pedagogy', () => {
  it('Shahed at 200m under Krasukha + rain — very low radar Pd', () => {
    const shahed = buildThreat({ altitude_m: 200, location_grid: 'ECHO-7' });
    const state = buildWorldState({
      weather: {
        ...mockWeather,
        precipitation: 'light_rain',
        visibility_km: 5,
        eo_ir_modifier: 0.71,
        radar_modifier: 0.82,
      },
    });
    state.red_force.platforms = [shahed];

    const result = fogOfWarEngine.calculatePd(
      shahed,
      'radar',
      {
        weather: state.weather,
        ew_assets_active: state.red_force.ew_assets.filter((a) => a.status === 'active'),
        time_of_day: state.time_of_day,
        terrain_type: state.terrain.primary_feature,
        detecting_force: 'BLUE',
      },
      35,
    );

    expect(result.final_pd).toBeLessThan(0.025);
    expect(fogOfWarEngine.pdToConfidence(result.final_pd)).toBe('possible');
  });

  it('kinetic task on misclassified decoy wastes magazine without destroying OWA', () => {
    const threat = buildThreat({ id: 'RED-OWA-REAL', status: 'airborne_tasked' });
    const state = buildWorldState({
      red_force: {
        ...buildWorldState().red_force,
        platforms: [threat],
      },
      all_contacts: [
        buildContact({
          contact_id: 'CNT-DECOY-01',
          true_platform_id: 'RED-DECOY-01',
          classification: 'OWA_possible',
          confidence: 'low',
          misclassified: true,
        }),
      ],
    });
    state.red_force.platforms.push({
      ...buildThreat({
        id: 'RED-DECOY-01',
        type: 'Gerbera',
        group: 'decoy',
        status: 'airborne_tasked',
      }),
    });

    const { events, resolvedState } = trainingAdjudicationCore.resolveTurn(
      state,
      null,
      kineticOrder('BLUE-CUAS-01', 'CNT-DECOY-01'),
      555,
    );

    expect(events.some((e) => e.description.includes('decoy'))).toBe(true);
    expect(resolvedState.blue_force.magazine_expended).toBe(1);
    const realThreat = resolvedState.red_force.platforms.find((p) => p.id === 'RED-OWA-REAL');
    expect(realThreat?.status).not.toBe('destroyed');
  });
});

describe('Phase 3 — SpectralRefOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('produces OversightGate with events and briefing (mocked REF)', async () => {
    const orchestrator = new SpectralRefOrchestrator(trainingAdjudicationCore);
    const state = buildWorldState();
    const seed = hashTurnSeed(state.exercise_id, state.turn, 1);

    const gate = await orchestrator.adjudicateTurn(
      state,
      null,
      kineticOrder('BLUE-CUAS-01'),
      seed,
      'ds-player-001',
    );

    expect(gate.requires_ds_approval).toBe(true);
    expect(gate.ds_approved).toBe(true);
    expect(gate.proposed_result.ds_briefing).toContain('REF narrative');
    expect(gate.proposed_result.exercise_id).toBe(state.exercise_id);
    expect(gate.proposed_result.world_state_after.all_contacts.length).toBeGreaterThan(0);
  });

  it('placeholder core emits DS-visible stub warning', async () => {
    const orchestrator = new SpectralRefOrchestrator(placeholderAdjudicationCore);
    const state = buildWorldState();
    const gate = await orchestrator.adjudicateTurn(state, null, null, 1, null);

    expect(
      gate.proposed_result.events.some((e) =>
        e.description.includes('ADJUDICATION CORE NOT IMPLEMENTED'),
      ),
    ).toBe(true);
    expect(gate.proposed_result.events[0].visible_to_ds).toBe(true);
  });
});

describe('Phase 3 — composeAdjudicationResult', () => {
  it('splits sensor pictures by force', () => {
    const state = buildWorldState({
      all_contacts: [
        buildContact({
          contact_id: 'C-RED',
          true_platform_id: 'BLUE-CUAS-01',
          classification: 'c_uas',
          confidence: 'high',
          detected_by: 'RED',
          location_grid: 'CHARLIE-3',
          altitude_m: 0,
        }),
        buildContact({
          contact_id: 'C-BLUE',
          true_platform_id: 'RED-OWA-01',
          classification: 'OWA',
          confidence: 'medium',
          detected_by: 'BLUE',
          location_grid: 'ECHO-7',
          altitude_m: 200,
        }),
      ],
    });

    const result = composeAdjudicationResult(state, [], 'Briefing', null, []);
    expect(result.red_sensor_picture).toHaveLength(1);
    expect(result.blue_sensor_picture).toHaveLength(1);
  });
});
