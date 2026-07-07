import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scenarioGeneratorEngine, type ScenarioGenerationRequest } from '@/lib/pcm/scenario-generator-engine';
import { assertResidency } from '@/lib/moat/sovereignData';

export const dynamic = 'force-dynamic'

const EMPTY_TERRAIN = { grid_datum: 'UTM', primary_feature: 'training_littoral', elevation_model: 'SRTM', urban_areas: [], choke_points: [], restricted_areas: [], sea_border: true, sea_state: 2 };
const EMPTY_WEATHER = { visibility_km: 20, cloud_base_ft: 5000, wind_speed_kt: 5, wind_bearing_deg: 270, temperature_c: 18, precipitation: 'none', sea_state: 1, eo_ir_modifier: 1, radar_modifier: 1, rf_propagation_modifier: 1, fpv_flyable: true };
const EMPTY_FORCE = { force_id: 'BLUE', comms_status: 'nominal', platforms_active: 0, platforms_destroyed: 0, magazine_expended: 0, magazine_remaining: 0, platforms: [], ew_assets: [], c2: { comms_status: 'nominal', gcs_location: 'D1', backup_gcs: null, link_health_percent: 100, primary_waveform: 'Link-16', backup_waveform: 'VHF' } };

export async function POST(req: NextRequest) {
  assertResidency('ap-southeast-2');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { data: player } = await supabase.from('spectral_players').select('id, role').eq('auth_user_id', user.id).single();
  if (!player || (player.role !== 'ds' && player.role !== 'rpic')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = (await req.json()) as ScenarioGenerationRequest;
  const config = await scenarioGeneratorEngine.generateFromLearnerRecord(body);
  const code = 'GEN-' + Date.now();
  const { data: row, error } = await supabase.from('spectral_scenarios').insert({
    name: config.title,
    code,
    description: config.generation_rationale,
    threat_model: config.primary_target_competency,
    key_lesson: config.instructor_focus_points[0]?.watch_for ?? 'Generated training focus',
    historical_basis: 'AI-generated PCM scenario (OSINT training tier)',
    primary_terrain: EMPTY_TERRAIN,
    initial_weather: EMPTY_WEATHER,
    red_base_orbat: { ...EMPTY_FORCE, force_id: 'RED' },
    blue_base_orbat: EMPTY_FORCE,
    objectives: [],
    inject_library: config.inject_sequence,
    ds_objectives: [config.primary_target_competency],
    generation_config: config,
    generated_for_player_id: player.id,
    generation_method: config.generation_method,
  }).select('id, code, generation_config').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ...config,
    scenario_row_id: row.id,
    scenario_code: row.code,
    ds_player_id: player.id,
    generation_config: row.generation_config,
  });
}
