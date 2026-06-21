import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertResidency } from '@/lib/moat/sovereignData';
import type { ForceDesignQuestion } from '@/lib/moat/forceDesignEngine';
import { parallelSimOrchestrator } from '@/lib/pcm/parallel-sim-orchestrator';

export async function POST(req: NextRequest) {
  assertResidency('ap-southeast-2');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = (await req.json()) as ForceDesignQuestion & { exercise_id?: string };
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
