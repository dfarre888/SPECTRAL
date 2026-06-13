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

    if (!body.ds_player_id || !body.inject_id) {
      return NextResponse.json(
        { error: 'ds_player_id and inject_id are required' },
        { status: 400 },
      );
    }

    const result = await worldStateEngine.fireInject(
      params.id,
      body.inject_id,
      body.ds_player_id,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, inject_id: body.inject_id });
  } catch (err) {
    console.error('[SPECTRAL] POST /exercises/:id/inject error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
