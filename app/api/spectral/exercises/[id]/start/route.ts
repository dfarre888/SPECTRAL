import { NextRequest, NextResponse } from 'next/server';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const { ds_player_id } = await req.json();

    if (!ds_player_id) {
      return NextResponse.json({ error: 'ds_player_id is required' }, { status: 400 });
    }

    const result = await worldStateEngine.startExercise(params.id, ds_player_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, exercise_id: params.id });
  } catch (err) {
    console.error('[SPECTRAL] POST /exercises/:id/start error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
