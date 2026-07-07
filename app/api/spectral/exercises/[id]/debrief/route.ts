import { NextRequest, NextResponse } from 'next/server';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { createClient } from '@/lib/supabase/server';
import { authorizeDsRoute } from '@/lib/moat/ds-route-auth';

export const dynamic = 'force-dynamic'

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

    const supabase = await createClient();
    const authErr = await authorizeDsRoute(supabase, auth.user!.id, ds_player_id);
    if (authErr) return authErr;

    const debrief = await worldStateEngine.getDebrief(params.id, ds_player_id);

    if (!debrief) {
      return NextResponse.json({ error: 'Debrief not available' }, { status: 404 });
    }

    return NextResponse.json({
      exercise_id: params.id,
      debrief,
    });
  } catch (err) {
    console.error('[SPECTRAL] GET /exercises/:id/debrief error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
