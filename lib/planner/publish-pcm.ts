/**
 * Publish battlespace plan → PCM exercise
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import 'server-only';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import type { BattlespacePlanRow } from '@/lib/planner/battlespace-plan';
import { planToWorldState } from '@/lib/planner/publish-wopr';

export interface PublishPcmResult {
  exerciseId: string;
  scenarioId: string;
  error?: string;
}

export async function publishPlanToPcm(
  plan: BattlespacePlanRow,
  dsPlayerId: string,
): Promise<PublishPcmResult> {
  const supabase = createServiceRoleNodeClient();
  const laydownWorld = planToWorldState(plan);

  const scenarioName = `Planner: ${plan.name}`;
  const { data: scenario, error: scenarioError } = await supabase
    .from('spectral_scenarios')
    .insert({
      name: scenarioName,
      description: `Battlespace plan ${plan.id} — ${plan.vignette_id ?? 'custom laydown'}`,
      red_platforms: laydownWorld.red_orbat.platforms.map((p) => p.platform_type),
      blue_systems: laydownWorld.blue_orbat.platforms.map((p) => p.platform_type),
      duration_mins: 120,
      max_turns: 8,
      generation_method: 'planner',
      generation_config: { plan_id: plan.id, laydown: plan.laydown },
    })
    .select('id')
    .single();

  if (scenarioError || !scenario) {
    return { exerciseId: '', scenarioId: '', error: scenarioError?.message ?? 'Scenario insert failed' };
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from('spectral_exercises')
    .insert({
      scenario_id: scenario.id,
      difficulty: 'base',
      red_player_id: null,
      blue_player_id: null,
      ds_player_id: dsPlayerId,
      blind_mode: false,
      current_world_state: { planner_laydown: plan.laydown, plan_id: plan.id },
      current_turn: 0,
      status: 'setup',
    })
    .select('id')
    .single();

  if (exerciseError || !exercise) {
    return { exerciseId: '', scenarioId: scenario.id, error: exerciseError?.message ?? 'Exercise insert failed' };
  }

  return { exerciseId: exercise.id, scenarioId: scenario.id };
}
