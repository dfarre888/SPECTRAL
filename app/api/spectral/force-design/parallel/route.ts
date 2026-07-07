import { NextRequest, NextResponse } from 'next/server';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import { validateDsPlayer } from '@/lib/moat/moatStore';
import { authorizeDsRoute, resolveSessionDsPlayerId } from '@/lib/moat/ds-route-auth';
import { assertResidency } from '@/lib/moat/sovereignData';
import type { ForceDesignQuestion } from '@/lib/moat/forceDesignEngine';
import { parallelSimOrchestrator } from '@/lib/pcm/parallel-sim-orchestrator';

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  assertResidency('ap-southeast-2');
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  const body = (await req.json()) as ForceDesignQuestion & {
    exercise_id?: string;
    ds_player_id?: string;
  };

  const supabase = createServiceRoleNodeClient();
  const sessionDsId = await resolveSessionDsPlayerId(supabase, auth.user!.id);
  const dsPlayerId = body.ds_player_id ?? sessionDsId;
  if (!dsPlayerId) {
    return NextResponse.json({ error: 'DS role required' }, { status: 403 });
  }

  const isDs = await validateDsPlayer(supabase, dsPlayerId);
  if (!isDs) {
    return NextResponse.json({ error: 'DS role required' }, { status: 403 });
  }

  const authErr = await authorizeDsRoute(supabase, auth.user!.id, dsPlayerId);
  if (authErr) return authErr;

  const question = body;
  const now = new Date().toISOString();
  const result = await parallelSimOrchestrator.run({ question, mode: 'sequential' }, now);

  if (body.exercise_id) {
    const success = result.outcomes.filter((o) => o.outcome === 'force_succeeded').length;
    const total = result.outcomes.length || 1;
    await supabase.from('spectral_post_game_analyses').upsert({
      exercise_id: body.exercise_id,
      simulations_run: total,
      branches: result.outcomes,
      blue_win_probability: success / total,
      red_win_probability: 1 - success / total,
      stalemate_probability: 0,
      key_decision_turn: 1,
      key_decision_description: result.report.recommendation.slice(0, 500),
      key_decision_wrong_call_pct: 0,
      key_decision_error_type: 'tactical_error',
      curriculum_recommendations: [],
      next_session_recommendations: result.report.caveats,
      ds_report: result.report.recommendation,
    }, { onConflict: 'exercise_id' });
  }

  return NextResponse.json(result);
}
