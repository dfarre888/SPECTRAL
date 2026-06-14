import { NextRequest, NextResponse } from 'next/server';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import {
  loadCompetencyRecord,
  validateDsPlayer,
} from '@/lib/moat/moatStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const dsPlayerId = searchParams.get('ds_player_id');
    if (!dsPlayerId) {
      return NextResponse.json({ error: 'ds_player_id is required' }, { status: 400 });
    }

    const supabase = createServiceRoleNodeClient();
    const isDs = await validateDsPlayer(supabase, dsPlayerId);
    if (!isDs) {
      return NextResponse.json({ error: 'DS role required' }, { status: 403 });
    }

    const { data: player } = await supabase
      .from('spectral_players')
      .select('callsign')
      .eq('id', params.id)
      .single();

    const record = await loadCompetencyRecord(
      supabase,
      params.id,
      player?.callsign ?? 'UNKNOWN',
    );

    return NextResponse.json({ player_id: params.id, record });
  } catch (err) {
    console.error('[SPECTRAL] GET competency error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
