import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertResidency } from '@/lib/moat/sovereignData';
import { buildAARDocument } from '@/lib/pcm/aar-engine';
import { worldStateEngine } from '@/lib/pcm/worldStateEngine';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const exerciseId = req.nextUrl.searchParams.get('exercise_id');
  if (!exerciseId) return NextResponse.json({ error: 'exercise_id required' }, { status: 400 });
  const { data: player } = await supabase.from('spectral_players').select('id').eq('auth_user_id', user.id).single();
  if (!player) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await supabase.from('spectral_aar_documents').select('*').eq('exercise_id', exerciseId).eq('player_id', player.id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  assertResidency('ap-southeast-2');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const body = (await req.json()) as { exercise_id: string };
  const { data: player } = await supabase.from('spectral_players').select('id').eq('auth_user_id', user.id).single();
  if (!player) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const history = await worldStateEngine.getTurnHistory(body.exercise_id, player.id);
  const exercise = await worldStateEngine.getExercise(body.exercise_id);
  if (!exercise) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
  const doc = buildAARDocument(body.exercise_id, history, exercise.current_world_state);
  const { data, error } = await supabase.from('spectral_aar_documents').upsert({
    exercise_id: body.exercise_id,
    player_id: player.id,
    aar_document: doc,
    overall_grade: doc.overall_grade,
    accreditation_eligible: doc.accreditation_eligible,
  }, { onConflict: 'exercise_id,player_id' }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
