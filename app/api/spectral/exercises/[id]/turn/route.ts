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
    const body = await req.json();

    if (!body.ds_player_id) {
      return NextResponse.json({ error: 'ds_player_id is required' }, { status: 400 });
    }

    const result = await worldStateEngine.advanceTurn({
      exercise_id: params.id,
      ds_player_id: body.ds_player_id,
      force_advance: body.force_advance || false,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[SPECTRAL] POST /exercises/:id/turn error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
