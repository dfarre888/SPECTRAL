import { NextRequest, NextResponse } from 'next/server';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import type { PCM } from '@/lib/pcm/spectral.types';

export async function POST(req: NextRequest) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const body = (await req.json()) as PCM.CreateExerciseRequest;

    if (!body.scenario_id || !body.ds_player_id) {
      return NextResponse.json(
        { error: 'scenario_id and ds_player_id are required' },
        { status: 400 },
      );
    }

    const result = await worldStateEngine.createExercise(body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('[SPECTRAL] POST /exercises error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
