/**
 * SPECTRAL PCM — AAR engine tests
 */
import { describe, it, expect } from 'vitest';
import { buildAARDocument, gradeAARReport, finaliseExerciseAAR, buildAAR } from '@/lib/pcm/aar-engine';
import type { PCM } from '@/lib/pcm/spectral.types';

const minimalForce = (): PCM.ForceOrbat => ({
  force_id: 'BLUE', comms_status: 'nominal', platforms_active: 1, platforms_destroyed: 0,
  magazine_expended: 4, magazine_remaining: 8, platforms: [], ew_assets: [],
  c2: { comms_status: 'nominal', gcs_location: 'D1', backup_gcs: null, link_health_percent: 72, primary_waveform: 'Link-16', backup_waveform: 'VHF' },
});

const ws = (turn = 2): PCM.WorldState => ({
  exercise_id: 'ex-aar', scenario_id: 'sc', turn, max_turns: 12, time_elapsed_minutes: 30,
  time_of_day: 'morning', phase: 'contested', outcome: 'continues',
  terrain: { grid_datum: 'UTM', primary_feature: 'coastal', elevation_model: 'SRTM', urban_areas: [], choke_points: [], restricted_areas: [], sea_border: true, sea_state: 2 },
  weather: { visibility_km: 20, cloud_base_ft: 5000, wind_speed_kt: 5, wind_bearing_deg: 270, temperature_c: 18, precipitation: 'none', sea_state: 1, eo_ir_modifier: 1, radar_modifier: 1, rf_propagation_modifier: 1, fpv_flyable: true },
  red_force: { ...minimalForce(), force_id: 'RED' }, blue_force: minimalForce(), all_contacts: [], red_orders: null, blue_orders: null,
  inject_queue: [], injects_fired: [], objectives: [], created_at: '2026-06-16T00:00:00.000Z', updated_at: '2026-06-16T00:00:00.000Z', version: 1,
});

const turnRecords = (): PCM.TurnRecord[] => [{
  turn: 1, timestamp: '2026-06-16T00:15:00.000Z', red_orders: null, blue_orders: null,
  world_state_snapshot: ws(1),
  adjudication: { turn: 1, exercise_id: 'ex-aar', events: [{ event_id: 'IMP-1', type: 'impact', description: 'Leaker impact on grid ECHO-7', affected_platform_ids: ['NODE-1'], visible_to_red: true, visible_to_blue: true, visible_to_ds: true }], injects_fired: [], world_state_after: ws(1), red_sensor_picture: [], blue_sensor_picture: [], ds_briefing: '', blue_suggestion: null, outcome: 'continues', blue_win_probability: 0.4, key_decision_this_turn: true },
}];

describe('aar-engine', () => {
  it('re-exports buildAAR from debrief-engine', () => {
    expect(buildAAR('ex-aar', turnRecords(), ws()).sections).toHaveLength(6);
  });

  it('grades unsatisfactory on multiple leakers and low win prob', () => {
    const report = buildAAR('ex-aar', turnRecords(), ws());
    report.leaker_count_total = 3;
    report.blue_win_probability_final = 0.2;
    expect(gradeAARReport(report)).toBe('unsatisfactory');
  });

  it('grades commendable with zero leakers and strong win prob', () => {
    const report = buildAAR('ex-aar', [], ws());
    report.leaker_count_total = 0;
    report.blue_win_probability_final = 0.75;
    expect(gradeAARReport(report)).toBe('commendable');
  });

  it('buildAARDocument wraps report with grade metadata', () => {
    const doc = buildAARDocument('ex-aar', turnRecords(), ws(), '2026-06-21T00:00:00.000Z');
    expect(doc.exercise_id).toBe('ex-aar');
    expect(doc.generated_at).toContain('2026');
  });

  it('marks accreditation eligible for distinguished grade', () => {
    const report = buildAAR('ex-aar', [], ws());
    report.leaker_count_total = 0;
    report.blue_win_probability_final = 0.9;
    expect(gradeAARReport(report)).toBe('distinguished');
    const doc = buildAARDocument('ex-aar', [], ws());
    doc.report.leaker_count_total = 0;
    doc.report.blue_win_probability_final = 0.9;
    expect(buildAARDocument('ex-aar', [], ws()).overall_grade).toBeDefined();
  });

  it('finaliseExerciseAAR matches buildAARDocument grade', () => {
    const a = finaliseExerciseAAR('ex-aar', turnRecords(), ws());
    const b = buildAARDocument('ex-aar', turnRecords(), ws());
    expect(a.overall_grade).toBe(b.overall_grade);
  });

  it('collects competency highlights array', () => {
    expect(Array.isArray(buildAARDocument('ex-aar', turnRecords(), ws()).competency_highlights)).toBe(true);
  });

  it('grades developing for single leaker moderate win', () => {
    const report = buildAAR('ex-aar', turnRecords(), ws());
    report.leaker_count_total = 1;
    report.blue_win_probability_final = 0.42;
    expect(gradeAARReport(report)).toBe('developing');
  });

  it('grades satisfactory as default balanced outcome', () => {
    const report = buildAAR('ex-aar', [], ws());
    report.leaker_count_total = 1;
    report.blue_win_probability_final = 0.55;
    expect(gradeAARReport(report)).toBe('satisfactory');
  });

  it('includes debrief text on nested report', () => {
    expect(buildAARDocument('ex-aar', turnRecords(), ws()).report.debrief_text).toContain('SPECTRAL AFTER ACTION REVIEW');
  });
});
