/**
 * Supabase persistence for moat-builder tables (service-role from WSE / API).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PCM } from '@/lib/pcm/spectral.types';
import type { LongitudinalCompetencyRecord } from '@/lib/moat/learnerModel.types';
import {
  learnerModelEngine,
  type TurnObservation,
} from '@/lib/moat/learnerModelEngine';
import { curriculumEngine, type TrainingPlan } from '@/lib/moat/curriculumEngine';
import {
  currencyEngine,
  type CurrencyUpdate,
} from '@/lib/moat/currencyEngine';
import type { ForceDesignReport } from '@/lib/moat/forceDesignEngine';
import {
  buildTurnObservation,
  computeDecisionTimeSec,
} from '@/lib/moat/behaviourMapper';
import { observeTurn } from '@/lib/pcm/spectralRefOrchestrator';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type PlayerProfile = PCM.PlayerProfile;

interface CompetencyRow {
  player_id: string;
  callsign: string;
  competencies: LongitudinalCompetencyRecord['competencies'];
  blind_spots: LongitudinalCompetencyRecord['blind_spots'];
  total_exercises: number;
  total_turns: number;
  first_exercise_at: string | null;
  most_recent_exercise_at: string | null;
  decision_speed_profile: LongitudinalCompetencyRecord['decision_speed_profile'];
  overall_level: LongitudinalCompetencyRecord['overall_level'];
  competency_summary: LongitudinalCompetencyRecord['competency_summary'];
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: CompetencyRow): LongitudinalCompetencyRecord {
  return {
    player_id: row.player_id,
    callsign: row.callsign,
    competencies: row.competencies,
    blind_spots: row.blind_spots,
    total_exercises: row.total_exercises,
    total_turns: row.total_turns,
    first_exercise_at: row.first_exercise_at ?? row.created_at,
    most_recent_exercise_at: row.most_recent_exercise_at ?? row.updated_at,
    decision_speed_profile: row.decision_speed_profile,
    overall_level: row.overall_level,
    competency_summary: row.competency_summary,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function recordToRow(record: LongitudinalCompetencyRecord): CompetencyRow {
  return {
    player_id: record.player_id,
    callsign: record.callsign,
    competencies: record.competencies,
    blind_spots: record.blind_spots,
    total_exercises: record.total_exercises,
    total_turns: record.total_turns,
    first_exercise_at: record.first_exercise_at,
    most_recent_exercise_at: record.most_recent_exercise_at,
    decision_speed_profile: record.decision_speed_profile,
    overall_level: record.overall_level,
    competency_summary: record.competency_summary,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export async function loadCompetencyRecord(
  supabase: SupabaseClient,
  playerId: string,
  callsign: string,
): Promise<LongitudinalCompetencyRecord> {
  const { data } = await supabase
    .from('spectral_competency_records')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  if (data) return rowToRecord(data as CompetencyRow);

  const now = new Date().toISOString();
  const empty = learnerModelEngine.createEmptyRecord(playerId, callsign, now);
  await upsertCompetencyRecord(supabase, empty);
  return empty;
}

export async function upsertCompetencyRecord(
  supabase: SupabaseClient,
  record: LongitudinalCompetencyRecord,
): Promise<void> {
  const row = recordToRow(record);
  const { error } = await supabase.from('spectral_competency_records').upsert(
    {
      ...row,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' },
  );
  if (error) throw new Error(`competency upsert failed: ${error.message}`);
}

export async function saveTrainingPlan(
  supabase: SupabaseClient,
  plan: TrainingPlan,
): Promise<string> {
  await supabase
    .from('spectral_training_plans')
    .update({ status: 'superseded' })
    .eq('player_id', plan.player_id)
    .eq('status', 'active');

  const { data, error } = await supabase
    .from('spectral_training_plans')
    .insert({
      player_id: plan.player_id,
      callsign: plan.callsign,
      generated_at: plan.generated_at,
      assignments: plan.assignments,
      instructor_brief: plan.instructor_brief,
      success_definition: plan.success_definition,
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`training plan insert failed: ${error?.message}`);
  return data.id as string;
}

export async function getActiveTrainingPlan(
  supabase: SupabaseClient,
  playerId: string,
): Promise<TrainingPlan | null> {
  const { data } = await supabase
    .from('spectral_training_plans')
    .select('*')
    .eq('player_id', playerId)
    .eq('status', 'active')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    player_id: data.player_id,
    callsign: data.callsign,
    generated_at: data.generated_at,
    assignments: data.assignments,
    instructor_brief: data.instructor_brief,
    success_definition: data.success_definition,
  };
}

export async function listCurrencyUpdates(
  supabase: SupabaseClient,
  status?: string,
): Promise<CurrencyUpdate[]> {
  let q = supabase.from('spectral_currency_updates').select('*').order('detected_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as CurrencyUpdate[];
}

export async function upsertCurrencyUpdate(
  supabase: SupabaseClient,
  update: CurrencyUpdate,
): Promise<void> {
  const { error } = await supabase.from('spectral_currency_updates').upsert(update);
  if (error) throw new Error(error.message);
}

export async function saveForceDesignReport(
  supabase: SupabaseClient,
  report: ForceDesignReport,
  createdBy: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from('spectral_force_design_reports')
    .insert({
      question: report.question,
      findings: report.findings,
      recommendation: report.recommendation,
      caveats: report.caveats,
      data_provenance: report.data_provenance,
      generated_at: report.generated_at,
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'force design insert failed');
  return data.id as string;
}

export async function listSovereignPlatforms(
  supabase: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from('spectral_sovereign_platforms')
    .select('*')
    .order('display_name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

function defaultPlayerProfile(playerId: string, callsign: string): PlayerProfile {
  const now = new Date().toISOString();
  return {
    player_id: playerId,
    callsign,
    force_preference: 'BLUE',
    session_history: [],
    total_turns_observed: 0,
    decision_speed_baseline_sec: 0,
    decision_speed_under_ew_sec: 0,
    decision_speed_under_saturation_sec: 0,
    decision_speed_at_night_sec: 0,
    decision_speed_assessment: '',
    tactical_tendencies: [],
    knowledge_gaps: [],
    risk_profile: { tolerance: 'medium', assessment: '', exploit: '' },
    exploit_recommendations: [],
    win_count: 0,
    loss_count: 0,
    stalemate_count: 0,
    current_difficulty: 'base',
    created_at: now,
    updated_at: now,
  };
}

export async function loadPlayerProfile(
  supabase: SupabaseClient,
  playerId: string,
  callsign: string,
): Promise<PlayerProfile> {
  const { data } = await supabase
    .from('spectral_player_profiles')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle();

  if (!data) return defaultPlayerProfile(playerId, callsign);

  return {
    player_id: playerId,
    callsign,
    force_preference: 'BLUE',
    session_history: (data.session_history as string[]) ?? [],
    total_turns_observed: data.total_turns_observed ?? 0,
    decision_speed_baseline_sec: data.decision_speed_baseline_sec ?? 0,
    decision_speed_under_ew_sec: data.decision_speed_under_ew_sec ?? 0,
    decision_speed_under_saturation_sec: data.decision_speed_under_saturation_sec ?? 0,
    decision_speed_at_night_sec: data.decision_speed_at_night_sec ?? 0,
    decision_speed_assessment: data.decision_speed_assessment ?? '',
    tactical_tendencies: (data.tactical_tendencies as PlayerProfile['tactical_tendencies']) ?? [],
    knowledge_gaps: (data.knowledge_gaps as PlayerProfile['knowledge_gaps']) ?? [],
    risk_profile: (data.risk_profile as PlayerProfile['risk_profile']) ?? {
      tolerance: 'medium',
      assessment: '',
      exploit: '',
    },
    exploit_recommendations:
      (data.exploit_recommendations as PlayerProfile['exploit_recommendations']) ?? [],
    win_count: data.win_count ?? 0,
    loss_count: data.loss_count ?? 0,
    stalemate_count: data.stalemate_count ?? 0,
    current_difficulty: data.current_difficulty ?? 'base',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function upsertPlayerProfile(
  supabase: SupabaseClient,
  profile: PlayerProfile,
): Promise<void> {
  const { error } = await supabase.from('spectral_player_profiles').upsert(
    {
      player_id: profile.player_id,
      session_history: profile.session_history,
      total_turns_observed: profile.total_turns_observed,
      decision_speed_baseline_sec: profile.decision_speed_baseline_sec,
      decision_speed_under_ew_sec: profile.decision_speed_under_ew_sec,
      decision_speed_under_saturation_sec: profile.decision_speed_under_saturation_sec,
      decision_speed_at_night_sec: profile.decision_speed_at_night_sec,
      decision_speed_assessment: profile.decision_speed_assessment,
      tactical_tendencies: profile.tactical_tendencies,
      knowledge_gaps: profile.knowledge_gaps,
      risk_profile: profile.risk_profile,
      exploit_recommendations: profile.exploit_recommendations,
      win_count: profile.win_count,
      loss_count: profile.loss_count,
      stalemate_count: profile.stalemate_count,
      current_difficulty: profile.current_difficulty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' },
  );
  if (error) throw new Error(`player profile upsert failed: ${error.message}`);
}

export async function getPlayerCallsign(
  supabase: SupabaseClient,
  playerId: string,
): Promise<string> {
  const { data } = await supabase
    .from('spectral_players')
    .select('callsign')
    .eq('id', playerId)
    .single();
  return data?.callsign ?? 'UNKNOWN';
}

export interface MoatTurnInput {
  exerciseId: string;
  bluePlayerId: string;
  preState: WorldState;
  postState: WorldState;
  redOrders: Order | null;
  blueOrders: Order | null;
  events: PCM.AdjudicationEvent[];
  exerciseComplete: boolean;
  blueWinProbability: number;
}

/**
 * Process learner model + REF profile after adjudication. Non-fatal on DB errors.
 */
export async function processMoatAfterTurn(
  supabase: SupabaseClient,
  input: MoatTurnInput,
): Promise<void> {
  try {
    const callsign = await getPlayerCallsign(supabase, input.bluePlayerId);
    const now = new Date().toISOString();
    const recordAtStart = await loadCompetencyRecord(
      supabase,
      input.bluePlayerId,
      callsign,
    );

    const decisionTimeSec = computeDecisionTimeSec(input.redOrders, input.blueOrders);
    const observation: TurnObservation = buildTurnObservation(
      input.exerciseId,
      input.preState,
      input.postState,
      input.blueOrders,
      input.events,
      decisionTimeSec,
      now,
    );

    let record = learnerModelEngine.ingestTurn(recordAtStart, observation);
    await upsertCompetencyRecord(supabase, record);

    let profile = await loadPlayerProfile(supabase, input.bluePlayerId, callsign);
    profile = observeTurn(
      profile,
      input.postState,
      input.blueOrders,
      decisionTimeSec ?? 0,
    );
    await upsertPlayerProfile(supabase, profile);

    if (input.exerciseComplete) {
      record = learnerModelEngine.finaliseExercise(recordAtStart, record, input.exerciseId);
      await upsertCompetencyRecord(supabase, record);

      const plan = curriculumEngine.generateTrainingPlan(record, now);
      await saveTrainingPlan(supabase, plan);

      if (input.postState.outcome === 'blue_wins') profile.win_count += 1;
      else if (input.postState.outcome === 'red_wins') profile.loss_count += 1;
      else if (input.postState.outcome === 'stalemate') profile.stalemate_count += 1;

      if (!profile.session_history.includes(input.exerciseId)) {
        profile.session_history = [...profile.session_history, input.exerciseId];
      }
      await upsertPlayerProfile(supabase, profile);
    }
  } catch (err) {
    console.error('[SPECTRAL Moat] processMoatAfterTurn failed:', err);
  }
}

export async function validateDsPlayer(
  supabase: SupabaseClient,
  dsPlayerId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('spectral_players')
    .select('role')
    .or(`id.eq.${dsPlayerId},auth_user_id.eq.${dsPlayerId}`)
    .single();
  return data?.role === 'ds';
}

export { currencyEngine };
