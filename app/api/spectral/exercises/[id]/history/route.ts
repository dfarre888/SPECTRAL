import { NextRequest, NextResponse } from 'next/server';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const ds_player_id = searchParams.get('ds_player_id');

    if (!ds_player_id) {
      return NextResponse.json({ error: 'ds_player_id is required' }, { status: 400 });
    }

    const history = await worldStateEngine.getTurnHistory(params.id, ds_player_id);

    return NextResponse.json({
      exercise_id: params.id,
      turn_count: history.length,
      history,
    });
  } catch (err) {
    console.error('[SPECTRAL] GET /exercises/:id/history error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
