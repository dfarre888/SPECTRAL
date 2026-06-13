/**
 * SPECTRAL PCM Phase 1 — end-to-end integration test
 *
 * Prerequisites:
 * 1. Apply migration: supabase db push (or run SQL in Supabase dashboard)
 * 2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 3. At least one row in spectral_scenarios (seed via migration or manual insert)
 *
 * Run: npx tsx scripts/spectral-integration-test.ts
 */

import { createClient } from '@supabase/supabase-js';
import { worldStateEngine } from '../lib/pcm/worldStateEngine';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set in .env.local first.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  console.log('SPECTRAL PCM Phase 1 — integration test');
  console.log('Ensure migration 20260613120000_spectral_world_state_engine.sql has been applied.\n');

  const { data: dsPlayer, error: dsError } = await supabase
    .from('spectral_players')
    .insert({
      callsign: 'INTEGRATION-DS',
      role: 'ds',
      organisation: 'SPECTRAL Test',
    })
    .select()
    .single();

  if (dsError || !dsPlayer) {
    console.error('Failed to create DS player:', dsError?.message);
    process.exit(1);
  }
  console.log('✓ Created DS player:', dsPlayer.id);

  const { data: redPlayer } = await supabase
    .from('spectral_players')
    .insert({ callsign: 'INTEGRATION-RED', role: 'red_commander' })
    .select()
    .single();

  const { data: bluePlayer } = await supabase
    .from('spectral_players')
    .insert({ callsign: 'INTEGRATION-BLUE', role: 'blue_commander' })
    .select()
    .single();

  if (!redPlayer || !bluePlayer) {
    console.error('Failed to create force players');
    process.exit(1);
  }
  console.log('✓ Created Red/Blue players');

  const { data: scenarios, error: scenarioError } = await supabase
    .from('spectral_scenarios')
    .select('id, name')
    .limit(1);

  if (scenarioError || !scenarios?.length) {
    console.error(
      'No scenarios found. Insert at least one spectral_scenarios row after migration.',
    );
    process.exit(1);
  }

  const scenario = scenarios[0];
  console.log('✓ Using scenario:', scenario.name, scenario.id);

  const createResult = await worldStateEngine.createExercise({
    scenario_id: scenario.id,
    difficulty: 'base',
    red_player_id: redPlayer.id,
    blue_player_id: bluePlayer.id,
    ds_player_id: dsPlayer.id,
    blind_mode: true,
  });

  if (createResult.error || !createResult.exercise_id) {
    console.error('Failed to create exercise:', createResult.error);
    process.exit(1);
  }

  const exerciseId = createResult.exercise_id;
  console.log('✓ Created exercise:', exerciseId);

  const startResult = await worldStateEngine.startExercise(exerciseId, dsPlayer.id);
  if (!startResult.success) {
    console.error('Failed to start exercise:', startResult.error);
    process.exit(1);
  }
  console.log('✓ Started exercise');

  const mockOrder = {
    order_id: 'ORD-001',
    turn: 1,
    issued_by: 'RED' as const,
    issued_by_role: 'red_commander' as const,
    timestamp: new Date().toISOString(),
    situation: 'Test',
    mission: 'Test mission',
    execution: 'Hold',
    service_support: null,
    command_signal: null,
    platform_tasks: [],
    raw_text: 'Integration test order',
  };

  const redOrders = await worldStateEngine.submitOrders({
    exercise_id: exerciseId,
    force: 'RED',
    player_id: redPlayer.id,
    orders: mockOrder,
  });

  if (redOrders.error) {
    console.error('Red orders failed:', redOrders.error);
    process.exit(1);
  }
  console.log('✓ Red orders submitted, awaiting:', redOrders.awaiting_force);

  const blueOrders = await worldStateEngine.submitOrders({
    exercise_id: exerciseId,
    force: 'BLUE',
    player_id: bluePlayer.id,
    orders: { ...mockOrder, order_id: 'ORD-002', issued_by: 'BLUE', issued_by_role: 'blue_commander' },
  });

  if (!blueOrders.turn_complete) {
    console.error('Blue orders did not complete turn:', blueOrders);
    process.exit(1);
  }
  console.log('✓ Blue orders submitted — turn ready');

  const advance = await worldStateEngine.advanceTurn({
    exercise_id: exerciseId,
    ds_player_id: dsPlayer.id,
  });

  if (advance.error) {
    console.error('Turn advance failed:', advance.error);
    process.exit(1);
  }
  console.log('✓ Turn advanced to', advance.new_turn);

  const stubEvent = advance.adjudication.events.find((e) =>
    e.description?.includes('ADJUDICATION CORE NOT IMPLEMENTED'),
  );
  if (stubEvent) {
    console.error(
      'Training adjudication core not active — stub event detected. Set SPECTRAL_PCM_STUB_ADJUDICATION=false.',
    );
    process.exit(1);
  }
  console.log(
    '✓ Adjudication events:',
    advance.adjudication.events.length,
    '(training core active)',
  );
  if (!advance.adjudication.ds_briefing) {
    console.error('Missing DS briefing from REF orchestrator');
    process.exit(1);
  }
  console.log('✓ DS briefing present (REF orchestrator)');

  const history = await worldStateEngine.getTurnHistory(exerciseId, dsPlayer.id);
  const turnRecord = history.find((r) => r.turn === advance.new_turn);
  if (!turnRecord) {
    console.error('Turn record not found for turn', advance.new_turn);
    process.exit(1);
  }
  console.log('✓ Turn record verified (', history.length, 'records total)');

  const worldState = await worldStateEngine.getWorldState(exerciseId, dsPlayer.id);
  const redSensor = await worldStateEngine.getSensorPicture(exerciseId, redPlayer.id, 'RED');
  const blueSensor = await worldStateEngine.getSensorPicture(exerciseId, bluePlayer.id, 'BLUE');

  if (!worldState || redSensor === null || blueSensor === null) {
    console.error('Failed to fetch world state or sensor pictures');
    process.exit(1);
  }

  const worldPlatformCount =
    (worldState.red_force?.platforms?.length ?? 0) +
    (worldState.blue_force?.platforms?.length ?? 0);
  const sensorContactCount = redSensor.length + blueSensor.length;

  console.log('✓ World state platform count:', worldPlatformCount);
  console.log('✓ Sensor picture contact count:', sensorContactCount);
  console.log(
    sensorContactCount <= worldPlatformCount
      ? '✓ Fog of war: sensor pictures are filtered subset of world state'
      : '⚠ Sensor count exceeds platform count — review detection logic',
  );

  console.log('\nIntegration test PASSED');
  console.log('Exercise ID:', exerciseId);
}

main().catch((err) => {
  console.error('Integration test FAILED:', err);
  process.exit(1);
});
