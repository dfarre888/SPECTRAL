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

    const worldState = await worldStateEngine.getWorldState(params.id, ds_player_id);

    if (!worldState) {
      return NextResponse.json(
        { error: 'Not authorised or exercise not found' },
        { status: 403 },
      );
    }

    return NextResponse.json(worldState);
  } catch (err) {
    console.error('[SPECTRAL] GET /exercises/:id/world-state error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
