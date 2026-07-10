/**
 * SPECTRAL Persistent Combat Model
 * Phase 1 — World State Engine (WSE)
 *
 * The WSE is the single source of truth for the battlespace.
 * All reads/writes to world state pass through this module.
 * SPECTRAL-REF is the only caller with full access.
 * Players receive filtered sensor pictures only — never raw world state.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleNodeClient } from '@/lib/supabase/service-role-node';
import type { PCM } from '@/lib/pcm/spectral.types';
import {
  calculatePhase,
  calculateTimeOfDay,
} from '@/lib/pcm/turn-logic';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import { SpectralRefOrchestrator, finaliseExercise } from '@/lib/pcm/spectralRefOrchestrator';
import { persistAarDocument } from '@/lib/pcm/aar-persistence';
import { hashTurnSeed } from '@/lib/pcm/seeded-rng';
import { buildAdjudicationContext, preloadAccreditedData, preloadAccreditedErpRows } from '@/lib/pcm/adjudication-preload';
import { processMoatAfterTurn } from '@/lib/moat/moatStore';
import {
  buildTurnMemory,
  createRedAdaptiveState,
  recordAndAdapt,
  type RedAdaptiveState,
} from '@/lib/pcm/red-adaptive-ai';
import {
  applyDifficultyModifiers,
  defaultMagazineByType,
} from '@/lib/pcm/difficulty-modifiers';
import { buildAAR, type AARReport } from '@/lib/pcm/debrief-engine';
import { injectFeedContacts } from '@/lib/pcm/feed-contact-merge';
export { injectFeedContacts } from '@/lib/pcm/feed-contact-merge';

type WorldState = PCM.WorldState;
type Exercise = PCM.Exercise;
type Order = PCM.Order;
type TurnRecord = PCM.TurnRecord;
type AdjudicationResult = PCM.AdjudicationResult;
type Inject = PCM.Inject;
type Contact = PCM.Contact;
type ForceId = PCM.ForceId;
type TurnOutcome = PCM.TurnOutcome;
type CreateExerciseRequest = PCM.CreateExerciseRequest;
type CreateExerciseResponse = PCM.CreateExerciseResponse;
type SubmitOrdersRequest = PCM.SubmitOrdersRequest;
type SubmitOrdersResponse = PCM.SubmitOrdersResponse;
type AdvanceTurnRequest = PCM.AdvanceTurnRequest;
type AdvanceTurnResponse = PCM.AdvanceTurnResponse;

const getServiceClient = (): SupabaseClient => createServiceRoleNodeClient();

export class WorldStateEngine {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getServiceClient();
  }

  async createExercise(req: CreateExerciseRequest): Promise<CreateExerciseResponse> {
    try {
      const { data: scenario, error: scenarioError } = await this.supabase
        .from('spectral_scenarios')
        .select('*')
        .eq('id', req.scenario_id)
        .single();

      if (scenarioError || !scenario) {
        return {
          exercise_id: '',
          initial_world_state: {} as WorldState,
          red_sensor_picture: [],
          blue_sensor_picture: [],
          blue_suggestion: null,
          error: `Scenario not found: ${req.scenario_id}`,
        };
      }

      const initialWorldState = this.buildInitialWorldState(scenario, req.difficulty, req.custom_orbat);

      const { data: exercise, error: exerciseError } = await this.supabase
        .from('spectral_exercises')
        .insert({
          scenario_id: req.scenario_id,
          difficulty: req.difficulty,
          red_player_id: req.red_player_id,
          blue_player_id: req.blue_player_id,
          ds_player_id: req.ds_player_id,
          blind_mode: req.blind_mode,
          current_world_state: initialWorldState,
          current_turn: 0,
          status: 'setup',
        })
        .select()
        .single();

      if (exerciseError || !exercise) {
        return {
          exercise_id: '',
          initial_world_state: initialWorldState,
          red_sensor_picture: [],
          blue_sensor_picture: [],
          blue_suggestion: null,
          error: exerciseError?.message,
        };
      }

      initialWorldState.exercise_id = exercise.id;

      const redSensorPicture = this.generateSensorPicture(initialWorldState, 'RED');
      const blueSensorPicture = this.generateSensorPicture(initialWorldState, 'BLUE');
      initialWorldState.all_contacts = [...redSensorPicture, ...blueSensorPicture];

      await this.supabase
        .from('spectral_exercises')
        .update({ current_world_state: initialWorldState })
        .eq('id', exercise.id);

      await this.logTurnRecord(exercise.id, 0, initialWorldState, null, null, {
        turn: 0,
        exercise_id: exercise.id,
        events: [],
        injects_fired: [],
        world_state_after: initialWorldState,
        red_sensor_picture: redSensorPicture,
        blue_sensor_picture: blueSensorPicture,
        ds_briefing: `Exercise ${scenario.name} initialised. ${req.difficulty.toUpperCase()} configuration. ${scenario.max_turns} turns. Awaiting orders.`,
        blue_suggestion: null,
        outcome: 'continues',
        blue_win_probability: 0.5,
        key_decision_this_turn: false,
      });

      return {
        exercise_id: exercise.id,
        initial_world_state: initialWorldState,
        red_sensor_picture: redSensorPicture,
        blue_sensor_picture: blueSensorPicture,
        blue_suggestion: null,
      };
    } catch (err) {
      return {
        exercise_id: '',
        initial_world_state: {} as WorldState,
        red_sensor_picture: [],
        blue_sensor_picture: [],
        blue_suggestion: null,
        error: String(err),
      };
    }
  }

  async submitOrders(req: SubmitOrdersRequest): Promise<SubmitOrdersResponse> {
    try {
      const { data: exercise, error } = await this.supabase
        .from('spectral_exercises')
        .select('*')
        .eq('id', req.exercise_id)
        .single();

      if (error || !exercise) {
        return { turn_complete: false, awaiting_force: null, error: 'Exercise not found' };
      }

      if (exercise.status !== 'active') {
        return {
          turn_complete: false,
          awaiting_force: null,
          error: `Exercise is ${exercise.status} — cannot accept orders`,
        };
      }

      const playerAssigned = await this.validatePlayerForce(
        req.exercise_id,
        req.player_id,
        req.force,
      );
      if (!playerAssigned) {
        return { turn_complete: false, awaiting_force: null, error: 'Player not assigned to this force' };
      }

      const updatePayload: Record<string, unknown> = {};
      if (req.force === 'RED') {
        updatePayload.red_orders_current = req.orders;
        updatePayload.red_orders_submitted = true;
      } else {
        updatePayload.blue_orders_current = req.orders;
        updatePayload.blue_orders_submitted = true;
      }

      const { data: updatedExercise, error: updateError } = await this.supabase
        .from('spectral_exercises')
        .update(updatePayload)
        .eq('id', req.exercise_id)
        .select()
        .single();

      if (updateError || !updatedExercise) {
        return { turn_complete: false, awaiting_force: null, error: updateError?.message };
      }

      const bothSubmitted =
        updatedExercise.red_orders_submitted && updatedExercise.blue_orders_submitted;

      if (!bothSubmitted) {
        const awaiting: ForceId = updatedExercise.red_orders_submitted ? 'BLUE' : 'RED';
        return { turn_complete: false, awaiting_force: awaiting };
      }

      return {
        turn_complete: true,
        awaiting_force: null,
      };
    } catch (err) {
      return { turn_complete: false, awaiting_force: null, error: String(err) };
    }
  }

  async advanceTurn(req: AdvanceTurnRequest): Promise<AdvanceTurnResponse> {
    try {
      const { data: exercise, error } = await this.supabase
        .from('spectral_exercises')
        .select('*')
        .eq('id', req.exercise_id)
        .single();

      if (error || !exercise) {
        return {
          new_turn: 0,
          adjudication: {} as AdjudicationResult,
          exercise_complete: false,
          error: 'Exercise not found',
        };
      }

      const isDS = await this.validateDS(req.exercise_id, req.ds_player_id);
      if (!isDS) {
        return {
          new_turn: 0,
          adjudication: {} as AdjudicationResult,
          exercise_complete: false,
          error: 'Only DS can advance turn',
        };
      }

      if (
        !req.force_advance &&
        (!exercise.red_orders_submitted || !exercise.blue_orders_submitted)
      ) {
        const missing = !exercise.red_orders_submitted ? 'RED' : 'BLUE';
        return {
          new_turn: 0,
          adjudication: {} as AdjudicationResult,
          exercise_complete: false,
          error: `${missing} Force has not submitted orders. Use force_advance=true to override.`,
        };
      }

      const newTurn = exercise.current_turn + 1;
      const currentWorldState: WorldState = exercise.current_world_state;

      const updatedWorldState = await this.progressWorldState(
        currentWorldState,
        exercise.red_orders_current,
        exercise.blue_orders_current,
        newTurn,
      );

      const orchestrator = new SpectralRefOrchestrator();
      const seed = hashTurnSeed(req.exercise_id, newTurn, 42);
      const tenantId =
        (exercise as { tenant_id?: string | null }).tenant_id ?? null;
      const [accreditedData, accreditedErpRows] = await Promise.all([
        preloadAccreditedData(updatedWorldState),
        preloadAccreditedErpRows(),
      ]);
      const adjudicationCtx = await buildAdjudicationContext(
        this.supabase,
        updatedWorldState,
        tenantId,
        accreditedData,
        accreditedErpRows,
      );
      const gate = await orchestrator.adjudicateTurn(
        updatedWorldState,
        exercise.red_orders_current,
        exercise.blue_orders_current,
        seed,
        req.ds_player_id,
        adjudicationCtx,
      );

      const adjudication = gate.proposed_result;
      const scheduledInjects = this.getQueuedInjects(updatedWorldState, newTurn);
      adjudication.injects_fired = [
        ...new Set([...scheduledInjects, ...adjudication.injects_fired]),
      ];

      const resolvedWorldState = adjudication.world_state_after;
      const outcome = adjudication.outcome;
      const exerciseComplete =
        outcome !== 'continues' || newTurn >= (currentWorldState.max_turns || 18);

      // ── Red Adaptive AI: record turn outcomes, update strategy ─────────────
      // Derive intercept set from post-turn platform status (pre-turn comparison).
      // This avoids requiring interceptedThreatIds to be surfaced from adjudication.
      const preRedPlatforms = updatedWorldState.red_force.platforms;
      const postRedPlatforms = resolvedWorldState.red_force.platforms;
      const interceptedIdSet = new Set(
        postRedPlatforms
          .filter((p) => {
            const pre = preRedPlatforms.find((q) => q.id === p.id);
            return (
              pre?.status !== 'destroyed' &&
              p.status === 'destroyed'
            );
          })
          .map((p) => p.id),
      );
      const blueKineticExpended =
        (resolvedWorldState.blue_force.magazine_expended ?? 0) -
        (updatedWorldState.blue_force.magazine_expended ?? 0);

      const existingAiState = (
        updatedWorldState.red_force as unknown as Record<string, unknown>
      ).ai_state as RedAdaptiveState | undefined;
      const aiState = existingAiState ?? createRedAdaptiveState();
      const turnMem = buildTurnMemory(newTurn, preRedPlatforms, interceptedIdSet, blueKineticExpended);
      recordAndAdapt(aiState, turnMem);
      // Persist updated adaptive state into the resolved world state so it carries
      // forward to the next turn's resolveRedOrders() call.
      (resolvedWorldState.red_force as unknown as Record<string, unknown>).ai_state = aiState;

      await this.supabase
        .from('spectral_exercises')
        .update({
          current_world_state: resolvedWorldState,
          current_turn: newTurn,
          red_orders_submitted: false,
          blue_orders_submitted: false,
          red_orders_current: null,
          blue_orders_current: null,
          outcome: exerciseComplete ? outcome : null,
          status: exerciseComplete ? 'complete' : 'active',
          completed_at: exerciseComplete ? new Date().toISOString() : null,
        })
        .eq('id', req.exercise_id);

      await this.logTurnRecord(
        req.exercise_id,
        newTurn,
        resolvedWorldState,
        exercise.red_orders_current,
        exercise.blue_orders_current,
        adjudication,
      );

      if (
        process.env.SPECTRAL_PCM_STUB_ADJUDICATION !== 'true' &&
        exercise.blue_player_id
      ) {
        void processMoatAfterTurn(this.supabase, {
          exerciseId: req.exercise_id,
          bluePlayerId: exercise.blue_player_id,
          preState: updatedWorldState,
          postState: resolvedWorldState,
          redOrders: exercise.red_orders_current,
          blueOrders: exercise.blue_orders_current,
          events: adjudication.events,
          exerciseComplete,
          blueWinProbability: adjudication.blue_win_probability ?? 0.5,
        }).catch((err) => console.error('[Moat] processMoatAfterTurn failed:', err));
      }

      if (exerciseComplete) {
        const dsId = req.ds_player_id ?? exercise.ds_player_id;
        const history = dsId
          ? await this.getTurnHistory(req.exercise_id, dsId)
          : await this.fetchTurnHistoryInternal(req.exercise_id);
        if (history.length > 0) {
          const doc = finaliseExercise(req.exercise_id, history, resolvedWorldState);
          const learnerIds = [exercise.blue_player_id, exercise.red_player_id].filter(
            (id): id is string => !!id,
          );
          for (const playerId of learnerIds) {
            void persistAarDocument(this.supabase, req.exercise_id, playerId, doc).catch((err) =>
              console.error('[AAR] persistAarDocument failed:', err),
            );
          }
        }
      }

      return {
        new_turn: newTurn,
        adjudication,
        exercise_complete: exerciseComplete,
      };
    } catch (err) {
      return {
        new_turn: 0,
        adjudication: {} as AdjudicationResult,
        exercise_complete: false,
        error: String(err),
      };
    }
  }

  async getWorldState(exercise_id: string, ds_player_id: string): Promise<WorldState | null> {
    const isDS = await this.validateDS(exercise_id, ds_player_id);
    if (!isDS) return null;

    const { data, error } = await this.supabase
      .from('spectral_exercises')
      .select('current_world_state')
      .eq('id', exercise_id)
      .single();

    if (error || !data) return null;
    return data.current_world_state as WorldState;
  }

  async getSensorPicture(
    exercise_id: string,
    player_id: string,
    force: ForceId,
  ): Promise<Contact[] | null> {
    const assigned = await this.validatePlayerForce(exercise_id, player_id, force);
    if (!assigned) return null;

    const { data, error } = await this.supabase
      .from('spectral_turn_records')
      .select('red_sensor_picture, blue_sensor_picture')
      .eq('exercise_id', exercise_id)
      .order('turn', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return force === 'RED'
      ? (data.red_sensor_picture as Contact[])
      : (data.blue_sensor_picture as Contact[]);
  }

  async getExercise(exercise_id: string): Promise<Exercise | null> {
    const { data, error } = await this.supabase
      .from('spectral_exercises')
      .select('*')
      .eq('id', exercise_id)
      .single();

    if (error || !data) return null;
    return data as Exercise;
  }


  async getLatestGlobeState(exercise_id: string): Promise<{
    world_state: WorldState;
    sensor_picture: Contact[];
    adjudication_result?: AdjudicationResult;
    feed_classification?: string;
  } | null> {
    const exercise = await this.getExercise(exercise_id);
    if (!exercise) return null;

    const { data } = await this.supabase
      .from('spectral_turn_records')
      .select('world_state_snapshot, blue_sensor_picture, adjudication_result, turn')
      .eq('exercise_id', exercise_id)
      .order('turn', { ascending: false })
      .limit(1)
      .maybeSingle();

    const worldState = (data?.world_state_snapshot ?? exercise.current_world_state) as WorldState;
    const sensorPicture = (data?.blue_sensor_picture ?? []) as Contact[];
    const adjudication = data?.adjudication_result as AdjudicationResult | undefined;

    return {
      world_state: worldState,
      sensor_picture: sensorPicture,
      adjudication_result: adjudication,
      feed_classification: 'SYNTHETIC — OPEN BUILD — NO REAL DATA',
    };
  }

  async getDebrief(exercise_id: string, ds_player_id: string): Promise<AARReport | null> {
    const isDS = await this.validateDS(exercise_id, ds_player_id);
    if (!isDS) return null;
    const history = await this.getTurnHistory(exercise_id, ds_player_id);
    const exercise = await this.getExercise(exercise_id);
    if (!exercise) return null;
    return buildAAR(exercise_id, history, exercise.current_world_state);
  }

  async getTurnHistory(exercise_id: string, ds_player_id: string): Promise<TurnRecord[]> {
    const isDS = await this.validateDS(exercise_id, ds_player_id);
    if (!isDS) return [];
    return this.fetchTurnHistoryInternal(exercise_id);
  }

  private async fetchTurnHistoryInternal(exercise_id: string): Promise<TurnRecord[]> {
    const { data, error } = await this.supabase
      .from('spectral_turn_records')
      .select('*')
      .eq('exercise_id', exercise_id)
      .order('turn', { ascending: true });

    if (error || !data) return [];
    return data as TurnRecord[];
  }

  async fireInject(
    exercise_id: string,
    inject_id: string,
    ds_player_id: string,
  ): Promise<{ success: boolean; error?: string }> {
    const isDS = await this.validateDS(exercise_id, ds_player_id);
    if (!isDS) return { success: false, error: 'Only DS can fire injects' };

    const { data: exercise } = await this.supabase
      .from('spectral_exercises')
      .select('current_world_state')
      .eq('id', exercise_id)
      .single();

    if (!exercise) return { success: false, error: 'Exercise not found' };

    const { data: inject } = await this.supabase
      .from('spectral_inject_library')
      .select('*')
      .eq('id', inject_id)
      .single();

    if (!inject) return { success: false, error: `Inject ${inject_id} not found` };

    const worldState: WorldState = exercise.current_world_state;
    const updatedWorldState = this.applyInjectDelta(worldState, inject.world_state_delta);

    await this.supabase
      .from('spectral_exercises')
      .update({ current_world_state: updatedWorldState })
      .eq('id', exercise_id);

    return { success: true };
  }

  async startExercise(
    exercise_id: string,
    ds_player_id: string,
  ): Promise<{ success: boolean; error?: string }> {
    const isDS = await this.validateDS(exercise_id, ds_player_id);
    if (!isDS) return { success: false, error: 'Only DS can start exercises' };

    const { error } = await this.supabase
      .from('spectral_exercises')
      .update({ status: 'active', started_at: new Date().toISOString(), current_turn: 1 })
      .eq('id', exercise_id)
      .eq('status', 'setup');

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  private buildInitialWorldState(
    scenario: Record<string, unknown>,
    difficulty: string,
    customOrbat?: { red: PCM.Platform[]; blue: PCM.Platform[] },
  ): WorldState {
    const now = new Date().toISOString();

    const redOrbat = applyDifficultyModifiers(scenario.red_base_orbat, difficulty, 'RED');
    const blueOrbat = applyDifficultyModifiers(scenario.blue_base_orbat, difficulty, 'BLUE');

    if (customOrbat?.red?.length) {
      redOrbat.platforms = customOrbat.red;
      redOrbat.platforms_active = customOrbat.red.length;
    }
    if (customOrbat?.blue?.length) {
      blueOrbat.platforms = customOrbat.blue;
      blueOrbat.platforms_active = customOrbat.blue.length;
    }

    if (!blueOrbat.magazine_by_type) {
      blueOrbat.magazine_by_type = defaultMagazineByType(blueOrbat.magazine_remaining ?? 40);
    }

    return {
      exercise_id: '',
      scenario_id: scenario.id as string,
      turn: 0,
      max_turns: (scenario.max_turns as number) || 18,
      time_elapsed_minutes: 0,
      time_of_day: 'morning',
      phase: 'setup',
      outcome: 'continues',
      terrain: scenario.primary_terrain as WorldState['terrain'],
      weather: scenario.initial_weather as WorldState['weather'],
      red_force: redOrbat,
      blue_force: blueOrbat,
      all_contacts: [],
      red_orders: null,
      blue_orders: null,
      inject_queue: (scenario.inject_library as Inject[]) || [],
      injects_fired: [],
      objectives: (scenario.objectives as WorldState['objectives']) || [],
      created_at: now,
      updated_at: now,
      version: 1,
    };
  }

  private generateSensorPicture(worldState: WorldState, force: ForceId): Contact[] {
    return fogOfWarEngine.generateSensorPicture(worldState, force);
  }

  private async progressWorldState(
    currentState: WorldState,
    redOrders: Order | null,
    blueOrders: Order | null,
    newTurn: number,
  ): Promise<WorldState> {
    const updated = JSON.parse(JSON.stringify(currentState)) as WorldState;

    updated.turn = newTurn;
    updated.time_elapsed_minutes = newTurn * 15;
    updated.updated_at = new Date().toISOString();
    updated.version = (updated.version || 1) + 1;
    updated.red_orders = redOrders;
    updated.blue_orders = blueOrders;
    updated.time_of_day = calculateTimeOfDay(updated.time_elapsed_minutes);
    updated.phase = calculatePhase(newTurn, updated.max_turns);

    const injectsToFire = updated.inject_queue.filter(
      (i) => i.scheduled_turn === newTurn && i.status === 'queued',
    );

    for (const inject of injectsToFire) {
      const injected = this.applyInjectDelta(updated, inject.world_state_delta);
      Object.assign(updated, injected);
      inject.status = 'fired';
      inject.fired_turn = newTurn;
      updated.injects_fired.push(inject);
    }

    updated.inject_queue = updated.inject_queue.filter((i) => i.status === 'queued');

    return updated;
  }

  private applyInjectDelta(worldState: WorldState, delta: Record<string, unknown>): WorldState {
    const updated = JSON.parse(JSON.stringify(worldState)) as WorldState;

    if (delta.weather_update) {
      Object.assign(updated.weather, delta.weather_update);
    }

    if (delta.roe_update) {
      updated.roe = delta.roe_update as Record<string, unknown>;
    }

    if (delta.time_of_day) {
      updated.time_of_day = delta.time_of_day as WorldState['time_of_day'];
    }

    if (delta.blue_platform_update) {
      const pUpdate = delta.blue_platform_update as { platform_id: string; [key: string]: unknown };
      const platform = updated.blue_force.platforms.find((p) => p.id === pUpdate.platform_id);
      if (platform) {
        Object.assign(platform, pUpdate);
      }
    }

    if (delta.blue_platform_lost) {
      const { platform_id } = delta.blue_platform_lost as { platform_id: string };
      const platform = updated.blue_force.platforms.find((p) => p.id === platform_id);
      if (platform) {
        platform.status = 'destroyed';
        platform.quantity_remaining = 0;
        updated.blue_force.platforms_destroyed =
          (updated.blue_force.platforms_destroyed || 0) + 1;
        updated.blue_force.platforms_active = Math.max(
          0,
          (updated.blue_force.platforms_active || 1) - 1,
        );
      }
    }

    return updated;
  }

  private getQueuedInjects(worldState: WorldState, turn: number): string[] {
    return worldState.inject_queue
      .filter((i) => i.scheduled_turn === turn && i.status === 'queued')
      .map((i) => i.id);
  }

  private async logTurnRecord(
    exercise_id: string,
    turn: number,
    worldState: WorldState,
    redOrders: Order | null,
    blueOrders: Order | null,
    adjudication: AdjudicationResult,
  ): Promise<void> {
    await this.supabase.from('spectral_turn_records').insert({
      exercise_id,
      turn,
      world_state_snapshot: worldState,
      red_orders: redOrders,
      blue_orders: blueOrders,
      adjudication_result: adjudication,
      outcome: adjudication.outcome,
      blue_win_probability: adjudication.blue_win_probability,
      key_decision_turn: adjudication.key_decision_this_turn,
      injects_fired: adjudication.injects_fired,
      red_sensor_picture: adjudication.red_sensor_picture,
      blue_sensor_picture: adjudication.blue_sensor_picture,
      ds_briefing: adjudication.ds_briefing,
      blue_suggestion: adjudication.blue_suggestion,
    });
  }

  private async validatePlayerForce(
    exercise_id: string,
    player_id: string,
    force: ForceId,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('spectral_exercises')
      .select('red_player_id, blue_player_id')
      .eq('id', exercise_id)
      .single();

    if (!data) return false;

    const playerUUID = await this.getPlayerUUID(player_id);
    if (!playerUUID) return false;

    return force === 'RED'
      ? data.red_player_id === playerUUID
      : data.blue_player_id === playerUUID;
  }

  private async validateDS(exercise_id: string, ds_player_id: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('spectral_exercises')
      .select('ds_player_id')
      .eq('id', exercise_id)
      .single();

    if (!data) return false;

    const playerUUID = await this.getPlayerUUID(ds_player_id);
    return data.ds_player_id === playerUUID;
  }

  private async getPlayerUUID(player_id: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('spectral_players')
      .select('id')
      .or(`id.eq.${player_id},auth_user_id.eq.${player_id}`)
      .single();

    return data?.id || null;
  }
}

export const worldStateEngine = new WorldStateEngine();
