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
    const force = searchParams.get('force') as 'RED' | 'BLUE';
    const player_id = searchParams.get('player_id');

    if (!force || !player_id) {
      return NextResponse.json({ error: 'force and player_id are required' }, { status: 400 });
    }

    if (!['RED', 'BLUE'].includes(force)) {
      return NextResponse.json({ error: 'force must be RED or BLUE' }, { status: 400 });
    }

    const contacts = await worldStateEngine.getSensorPicture(params.id, player_id, force);

    if (contacts === null) {
      return NextResponse.json(
        { error: 'Not authorised — player not assigned to this force' },
        { status: 403 },
      );
    }

    return NextResponse.json({ force, contacts, count: contacts.length });
  } catch (err) {
    console.error('[SPECTRAL] GET /exercises/:id/sensor error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
