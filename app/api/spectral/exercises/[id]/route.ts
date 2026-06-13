import { NextRequest, NextResponse } from 'next/server';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const exercise = await worldStateEngine.getExercise(params.id);

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    const safeExercise = {
      id: exercise.id,
      scenario_id: exercise.scenario_id,
      session_number: exercise.session_number,
      difficulty: exercise.difficulty,
      status: exercise.status,
      current_turn: exercise.current_turn,
      red_orders_submitted: exercise.red_orders_submitted,
      blue_orders_submitted: exercise.blue_orders_submitted,
      outcome: exercise.outcome,
      started_at: exercise.started_at,
      completed_at: exercise.completed_at,
    };

    return NextResponse.json(safeExercise);
  } catch (err) {
    console.error('[SPECTRAL] GET /exercises/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
