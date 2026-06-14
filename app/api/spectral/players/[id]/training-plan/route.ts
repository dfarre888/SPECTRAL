import { NextRequest, NextResponse } from 'next/server';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import {
  loadCompetencyRecord,
  getActiveTrainingPlan,
  saveTrainingPlan,
  validateDsPlayer,
} from '@/lib/moat/moatStore';
import { curriculumEngine } from '@/lib/moat/curriculumEngine';

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

    const plan = await getActiveTrainingPlan(supabase, params.id);
    return NextResponse.json({ player_id: params.id, plan });
  } catch (err) {
    console.error('[SPECTRAL] GET training-plan error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const dsPlayerId = body.ds_player_id as string | undefined;
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
    const plan = curriculumEngine.generateTrainingPlan(record, new Date().toISOString());
    const planId = await saveTrainingPlan(supabase, plan);

    return NextResponse.json({ player_id: params.id, plan_id: planId, plan });
  } catch (err) {
    console.error('[SPECTRAL] POST training-plan error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
