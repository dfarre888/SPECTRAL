/**
 * SPECTRAL PCM — debrief-engine unit tests
 */
import { describe, it, expect } from 'vitest';
import { buildAAR, aarToText, type AARReport } from '@/lib/pcm/debrief-engine';
import type { PCM } from '@/lib/pcm/spectral.types';

type WorldState = PCM.WorldState;
type TurnRecord = PCM.TurnRecord;
type AdjudicationResult = PCM.AdjudicationResult;

const minimalForce = (): PCM.ForceOrbat => ({
  force_id: 'BLUE', comms_status: 'nominal', platforms_active: 1, platforms_destroyed: 0,
  magazine_expended: 4, magazine_remaining: 8, platforms: [], ew_assets: [],
  c2: { comms_status: 'nominal', gcs_location: 'D1', backup_gcs: null, link_health_percent: 72, primary_waveform: 'Link-16', backup_waveform: 'VHF' },
});

const minimalWorldState = (overrides: Partial<WorldState> = {}): WorldState => ({
  exercise_id: 'ex-001', scenario_id: 'sc-001', turn: 2, max_turns: 12, time_elapsed_minutes: 30,
  time_of_day: 'morning', phase: 'contested', outcome: 'continues', terrain: { grid_datum: 'UTM', primary_feature: 'coastal_littoral', elevation_model: 'SRTM', urban_areas: [], choke_points: [], restricted_areas: [], sea_border: true, sea_state: 2 },
  weather: { visibility_km: 20, cloud_base_ft: 5000, wind_speed_kt: 5, wind_bearing_deg: 270, temperature_c: 18,
    precipitation: 'none', sea_state: 1, eo_ir_modifier: 1.0, radar_modifier: 1.0, rf_propagation_modifier: 1.0, fpv_flyable: true },
  red_force: { ...minimalForce(), force_id: 'RED', magazine_expended: 0, magazine_remaining: 0 },
  blue_force: minimalForce(), all_contacts: [], red_orders: null, blue_orders: null,
  inject_queue: [], injects_fired: [], objectives: [],
  created_at: '2026-06-16T00:00:00.000Z', updated_at: '2026-06-16T00:00:00.000Z', version: 1, ...overrides,
});

const adjudication = (turn: number, events: PCM.AdjudicationEvent[], extra: Partial<AdjudicationResult> = {}): AdjudicationResult => ({
  turn, exercise_id: 'ex-001', events, injects_fired: [], world_state_after: minimalWorldState({ turn }),
  red_sensor_picture: [], blue_sensor_picture: [], ds_briefing: 'Turn ' + turn + ' complete.', blue_suggestion: null,
  outcome: 'continues', blue_win_probability: turn === 1 ? 0.55 : 0.62,
  key_decision_this_turn: extra.key_decision_this_turn ?? false, ...extra,
});

const syntheticTurnRecords = (): TurnRecord[] => [
  { turn: 1, timestamp: '2026-06-16T00:15:00.000Z', red_orders: null, blue_orders: null,
    world_state_snapshot: minimalWorldState({ turn: 1 }),
    adjudication: adjudication(1, [
      { event_id: 'WAVE-1', type: 'weapon_release', description: 'Red wave activated — 6 platforms inbound', affected_platform_ids: ['R1'], visible_to_red: true, visible_to_blue: true, visible_to_ds: true },
      { event_id: 'EW-1', type: 'ew_effect', description: 'Krasukha jamming L-band', affected_platform_ids: ['BLUE-RADAR'], visible_to_red: true, visible_to_blue: true, visible_to_ds: true },
      { event_id: 'INT-DEW', type: 'intercept_success', description: 'Coyote DEW kill layer=1 range_km=12', affected_platform_ids: ['R1'], visible_to_red: false, visible_to_blue: true, visible_to_ds: true },
    ], { key_decision_this_turn: true, blue_win_probability: 0.58 }) },
  { turn: 2, timestamp: '2026-06-16T00:30:00.000Z', red_orders: null, blue_orders: null,
    world_state_snapshot: minimalWorldState({ turn: 2 }),
    adjudication: adjudication(2, [
      { event_id: 'INT-KIN', type: 'intercept_success', description: 'Coyote kinetic intercept layer=2', affected_platform_ids: ['R3'], visible_to_red: false, visible_to_blue: true, visible_to_ds: true },
      { event_id: 'IMP-1', type: 'impact', description: 'Leaker impact on grid ECHO-7', affected_platform_ids: ['NODE-1'], visible_to_red: true, visible_to_blue: true, visible_to_ds: true },
      { event_id: 'SWARM-GNSS-1', type: 'ew_effect', description: 'GNSS jamming scattered swarm coherence', affected_platform_ids: ['R4'], visible_to_red: true, visible_to_blue: true, visible_to_ds: true },
      { event_id: 'MAG-1', type: 'weapon_release', description: 'Blue magazine empty on kinetic layer', affected_platform_ids: ['BLUE-COYOTE'], visible_to_red: false, visible_to_blue: true, visible_to_ds: true },
      { event_id: 'C2-1', type: 'comms_degradation', description: 'Link to GCS degraded_heavy under EW', affected_platform_ids: ['BLUE-C2'], visible_to_red: false, visible_to_blue: true, visible_to_ds: true },
      { event_id: 'ADAPT-1', type: 'ew_effect', description: 'Red ew-immune strategy shift to FPV mix', affected_platform_ids: ['RED-FPV'], visible_to_red: true, visible_to_blue: false, visible_to_ds: true },
    ], { blue_win_probability: 0.62 }) },
];

describe('debrief-engine — buildAAR()', () => {
  it('builds six AAR sections with aggregates and teaching points', () => {
    const aar = buildAAR('ex-001', syntheticTurnRecords(), minimalWorldState({ turn: 2, outcome: 'continues', phase: 'contested' }));
    expect(aar.exercise_id).toBe('ex-001');
    expect(aar.total_turns).toBe(2);
    expect(aar.sections).toHaveLength(6);
    expect(aar.sections.map((s) => s.heading)).toEqual(['SITUATION SUMMARY','RED FORCE ACTIONS','BLUE FORCE DEFENCE','KEY DECISIONS','SYSTEM PERFORMANCE','TRAINING OBJECTIVES']);
    expect(aar.key_decision_turns).toEqual([1]);
    expect(aar.leaker_count_total).toBe(1);
    expect(aar.red_platforms_launched).toBe(6);
    expect(aar.red_platforms_intercepted).toBe(2);
    expect(aar.ew_activations).toBe(3);
    expect(aar.blue_win_probability_final).toBe(0.62);
    expect(aar.sections.find((s) => s.heading === 'BLUE FORCE DEFENCE')?.body).toContain('DEW:1');
    expect(aar.sections.find((s) => s.heading === 'BLUE FORCE DEFENCE')?.body).toContain('Kinetic:1');
    const tp = aar.sections.find((s) => s.heading === 'TRAINING OBJECTIVES')?.teaching_points ?? [];
    expect(tp.length).toBeGreaterThanOrEqual(3);
    expect(tp.some((p) => p.includes('Magazine'))).toBe(true);
    expect(tp.some((p) => p.includes('GNSS'))).toBe(true);
    expect(tp.some((p) => p.includes('C2'))).toBe(true);
    expect(aar.debrief_text).toContain('=== SPECTRAL AFTER ACTION REVIEW ===');
  });
  it('parses intercept layer=1 and layer=2 from event descriptions', () => {
    const body = buildAAR('ex-001', syntheticTurnRecords(), minimalWorldState()).sections.find((s) => s.heading === 'BLUE FORCE DEFENCE')?.body ?? '';
    expect(body).toMatch(/DEW:1/);
    expect(body).toMatch(/Kinetic:1/);
    expect(body).toContain('EW:0');
  });
});
describe('debrief-engine — aarToText()', () => {
  it('renders headings, body, and teaching point bullets', () => {
    const aar = buildAAR('ex-train-42', syntheticTurnRecords(), minimalWorldState({ outcome: 'blue_wins' }));
    const text = aarToText(aar);
    expect(text).toContain('Exercise: ex-train-42');
    expect(text).toContain('--- TRAINING OBJECTIVES ---');
    expect(text).toContain('Teaching Points:');
    expect(text.split('•').length).toBeGreaterThan(2);
    expect(aarToText({ ...aar, debrief_text: '' } as AARReport)).toBe(text);
  });
});
