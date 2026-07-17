import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertResidency } from '@/lib/moat/sovereignData';
import { buildAARDocument } from '@/lib/pcm/aar-engine';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';
import { requireSpectralAuth } from '@/lib/pcm/require-auth';
import { authorizeDsRoute, resolveSessionDsPlayerId } from '@/lib/moat/ds-route-auth';
import { isDemoMode } from '@/lib/demo';
import { getTrainingAarDocument } from '@/lib/pcm/training-fixtures';
import { normalizeExerciseId } from '@/lib/pcm/showcase-exercise';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  const supabase = await createClient();
  const exerciseIdParam = req.nextUrl.searchParams.get('exercise_id');
  if (!exerciseIdParam) return NextResponse.json({ error: 'exercise_id required' }, { status: 400 });
  const canonicalExerciseId = normalizeExerciseId(exerciseIdParam);
  const dbExerciseIds =
    exerciseIdParam === canonicalExerciseId
      ? [exerciseIdParam]
      : [exerciseIdParam, canonicalExerciseId];

  const dsPlayerId = req.nextUrl.searchParams.get('ds_player_id');
  const targetPlayerId = req.nextUrl.searchParams.get('player_id');

  if (dsPlayerId) {
    const authErr = await authorizeDsRoute(
      supabase,
      auth.user!.id,
      dsPlayerId,
      targetPlayerId ?? undefined,
    );
    if (authErr) return authErr;
  }

  const { data: player } = await supabase
    .from('spectral_players')
    .select('id')
    .eq('auth_user_id', auth.user!.id)
    .maybeSingle();

  const playerId = targetPlayerId ?? player?.id;
  if (!playerId) {
    const doc = getTrainingAarDocument(canonicalExerciseId);
    return NextResponse.json({
      exercise_id: canonicalExerciseId,
      player_id: 'spectral-player',
      aar_document: doc,
      overall_grade: doc.overall_grade,
      accreditation_eligible: doc.accreditation_eligible,
    });
  }

  let data: Record<string, unknown> | null = null;
  for (const id of dbExerciseIds) {
    const { data: row } = await supabase
      .from('spectral_aar_documents')
      .select('*')
      .eq('exercise_id', id)
      .eq('player_id', playerId)
      .maybeSingle();
    if (row) {
      data = row as Record<string, unknown>;
      break;
    }
  }
  if (!data) {
    const doc = getTrainingAarDocument(canonicalExerciseId);
    return NextResponse.json({
      exercise_id: canonicalExerciseId,
      player_id: playerId,
      aar_document: doc,
      overall_grade: doc.overall_grade,
      accreditation_eligible: doc.accreditation_eligible,
    });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  assertResidency('ap-southeast-2');
  const auth = await requireSpectralAuth();
  if (auth.response) return auth.response;

  const supabase = await createClient();
  const body = (await req.json()) as {
    exercise_id: string;
    ds_player_id?: string;
    player_id?: string;
  };

  const exercise = await worldStateEngine.getExercise(body.exercise_id);
  if (!exercise) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });

  const { data: player } = await supabase
    .from('spectral_players')
    .select('id')
    .eq('auth_user_id', auth.user!.id)
    .maybeSingle();

  const playerId = body.player_id ?? player?.id;
  if (!playerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sessionDsId = isDemoMode()
    ? body.ds_player_id ?? exercise.ds_player_id
    : await resolveSessionDsPlayerId(supabase, auth.user!.id);
  const dsPlayerId = body.ds_player_id ?? sessionDsId ?? exercise.ds_player_id;
  if (!dsPlayerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (body.ds_player_id) {
    const authErr = await authorizeDsRoute(
      supabase,
      auth.user!.id,
      body.ds_player_id,
      playerId,
    );
    if (authErr) return authErr;
  } else if (!isDemoMode() && !sessionDsId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const history = await worldStateEngine.getTurnHistory(body.exercise_id, dsPlayerId);
  if (history.length === 0) {
    return NextResponse.json({ error: 'No turn history for exercise' }, { status: 404 });
  }

  const doc = buildAARDocument(body.exercise_id, history, exercise.current_world_state);
  const { data, error } = await supabase.from('spectral_aar_documents').upsert({
    exercise_id: body.exercise_id,
    player_id: playerId,
    aar_document: doc,
    overall_grade: doc.overall_grade,
    accreditation_eligible: doc.accreditation_eligible,
  }, { onConflict: 'exercise_id,player_id' }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
