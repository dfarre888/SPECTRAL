import { NextRequest, NextResponse } from 'next/server';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;
  try {
    const state = await worldStateEngine.getLatestGlobeState(params.id);
    if (!state) return NextResponse.json({ error: 'No globe state' }, { status: 404 });
    return NextResponse.json(state);
  } catch (err) {
    console.error('[SPECTRAL] globe-state error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
