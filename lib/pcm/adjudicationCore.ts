/**
 * SPECTRAL PCM — Adjudication Core interface boundary.
 * Training implementation: trainingAdjudicationCore.ts
 * Placeholder: for stub-only / export-control accredited swap-in.
 */

import type { PCM } from '@/lib/pcm/spectral.types';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type AdjudicationResult = PCM.AdjudicationResult;
type AdjudicationEvent = PCM.AdjudicationEvent;

export interface AdjudicationCore {
  resolveTurn(
    worldState: WorldState,
    redOrders: Order | null,
    blueOrders: Order | null,
    seed: number,
  ): { resolvedState: WorldState; events: AdjudicationEvent[] };
}

export const placeholderAdjudicationCore: AdjudicationCore = {
  resolveTurn(worldState, _redOrders, _blueOrders, _seed) {
    const resolvedState: WorldState = { ...worldState };
    const events: AdjudicationEvent[] = [
      {
        event_id: `STUB-${worldState.turn}`,
        type: 'objective_status_change',
        description:
          'ADJUDICATION CORE NOT IMPLEMENTED. No combat was resolved this turn. ' +
          'Enable training core or inject accredited AdjudicationCore for operational use.',
        affected_platform_ids: [],
        visible_to_red: false,
        visible_to_blue: false,
        visible_to_ds: true,
      },
    ];
    return { resolvedState, events };
  },
};

export function composeAdjudicationResult(
  resolvedState: WorldState,
  events: AdjudicationEvent[],
  dsBriefing: string,
  blueSuggestion: string | null,
  injectsFired: string[],
): AdjudicationResult {
  return {
    turn: resolvedState.turn,
    exercise_id: resolvedState.exercise_id,
    events,
    injects_fired: injectsFired,
    world_state_after: resolvedState,
    red_sensor_picture: resolvedState.all_contacts.filter((c) => c.detected_by === 'RED'),
    blue_sensor_picture: resolvedState.all_contacts.filter((c) => c.detected_by === 'BLUE'),
    ds_briefing: dsBriefing,
    blue_suggestion: blueSuggestion,
    outcome: resolvedState.outcome,
    blue_win_probability: 0.5,
    key_decision_this_turn: false,
  };
}
