/**
 * SPECTRAL PCM — AAR persistence tests
 */
import { describe, it, expect } from 'vitest';
import { buildAarDocumentRow } from '@/lib/pcm/aar-persistence';
import { buildAARDocument } from '@/lib/pcm/aar-engine';
import type { PCM } from '@/lib/pcm/spectral.types';

const minimalForce = (): PCM.ForceOrbat => ({
  force_id: 'BLUE', comms_status: 'nominal', platforms_active: 1, platforms_destroyed: 0,
  magazine_expended: 4, magazine_remaining: 8, platforms: [], ew_assets: [],
  c2: { comms_status: 'nominal', gcs_location: 'D1', backup_gcs: null, link_health_percent: 72, primary_waveform: 'Link-16', backup_waveform: 'VHF' },
});

const ws = (): PCM.WorldState => ({
  exercise_id: 'ex-persist', scenario_id: 'sc', turn: 2, max_turns: 12, time_elapsed_minutes: 30,
  time_of_day: 'morning', phase: 'contested', outcome: 'continues',
  terrain: { grid_datum: 'UTM', primary_feature: 'coastal', elevation_model: 'SRTM', urban_areas: [], choke_points: [], restricted_areas: [], sea_border: true, sea_state: 2 },
  weather: { visibility_km: 20, cloud_base_ft: 5000, wind_speed_kt: 5, wind_bearing_deg: 270, temperature_c: 18, precipitation: 'none', sea_state: 1, eo_ir_modifier: 1, radar_modifier: 1, rf_propagation_modifier: 1, fpv_flyable: true },
  red_force: { ...minimalForce(), force_id: 'RED' }, blue_force: minimalForce(), all_contacts: [], red_orders: null, blue_orders: null,
  inject_queue: [], injects_fired: [], objectives: [], created_at: '2026-06-16T00:00:00.000Z', updated_at: '2026-06-16T00:00:00.000Z', version: 1,
});

describe('aar-persistence', () => {
  it('buildAarDocumentRow maps document fields for upsert', () => {
    const doc = buildAARDocument('ex-persist', [], ws(), '2026-06-21T00:00:00.000Z');
    const row = buildAarDocumentRow('ex-persist', 'player-blue-uuid', doc);
    expect(row.exercise_id).toBe('ex-persist');
    expect(row.player_id).toBe('player-blue-uuid');
    expect(row.aar_document).toBe(doc);
    expect(row.overall_grade).toBe(doc.overall_grade);
    expect(row.accreditation_eligible).toBe(doc.accreditation_eligible);
  });
});
