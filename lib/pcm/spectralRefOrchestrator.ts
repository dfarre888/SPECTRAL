/**
 * SPECTRAL PCM Phase 3 — REF orchestrator, suggestion engine, profile hooks.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import {
  type AdjudicationCore,
  placeholderAdjudicationCore,
  composeAdjudicationResult,
} from '@/lib/pcm/adjudicationCore';
import { trainingAdjudicationCore } from '@/lib/pcm/trainingAdjudicationCore';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import {
  generateRefNarrative,
  wrapInOversightGate,
  type OversightGate,
} from '@/lib/pcm/spectralRefApi';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type PlayerProfile = PCM.PlayerProfile;
type TacticalTendency = PCM.TacticalTendency;

function defaultCore(): AdjudicationCore {
  if (process.env.SPECTRAL_PCM_STUB_ADJUDICATION === 'true') {
    return placeholderAdjudicationCore;
  }
  return trainingAdjudicationCore;
}

export class SpectralRefOrchestrator {
  private core: AdjudicationCore;

  constructor(core?: AdjudicationCore) {
    this.core = core ?? defaultCore();
  }

  async adjudicateTurn(
    worldState: WorldState,
    redOrders: Order | null,
    blueOrders: Order | null,
    seed: number,
    dsPlayerId: string | null = null,
  ): Promise<OversightGate> {
    const { resolvedState, events } = this.core.resolveTurn(
      worldState,
      redOrders,
      blueOrders,
      seed,
    );

    let dsBriefing = 'Adjudication complete.';
    let blueSuggestion: string | null = selectSuggestion(resolvedState, blueOrders);
    let injectsFired: string[] = [];

    const detectionSummary = fogOfWarEngine.getDetectionSummary(resolvedState);
    const detectionLine = `Red sees ${detectionSummary.redSees} contacts; Blue sees ${detectionSummary.blueSees}.`;

    try {
      const narrative = await generateRefNarrative(resolvedState, redOrders, blueOrders);
      dsBriefing = `${narrative.ds_briefing} ${detectionLine}`;
      blueSuggestion = narrative.blue_suggestion ?? blueSuggestion;
      if (narrative.proposed_inject_id) injectsFired = [narrative.proposed_inject_id];
    } catch {
      dsBriefing =
        `Turn ${resolvedState.turn}: ${detectionLine} ` +
        `${detectionSummary.blueMissing.length > 0 ? 'Blue NOT tracking: ' + detectionSummary.blueMissing.join(', ') + '.' : 'Blue tracking all Red assets.'}`;
    }

    const result = composeAdjudicationResult(
      resolvedState,
      events,
      dsBriefing,
      blueSuggestion,
      injectsFired,
    );

    return wrapInOversightGate(result, true, dsPlayerId);
  }
}

export const SUGGESTION_PATTERNS = {
  magazine_discipline: (remaining: number) =>
    `You have ${remaining} defensive rounds remaining. How many do you intend to reserve, and what releases them?`,
  detection_confidence: () =>
    `One contact is low-confidence. What would confirmation cost, and what would being wrong cost?`,
  tempo: () =>
    `You have been reacting. Is there an action that forces your opponent to react to you instead?`,
};

export function selectSuggestion(worldState: WorldState, blueOrders: Order | null): string | null {
  const blue = worldState.blue_force;
  if (blue.magazine_remaining > 0 && blue.magazine_remaining <= 6) {
    return SUGGESTION_PATTERNS.magazine_discipline(blue.magazine_remaining);
  }
  const hasLowConfidence = worldState.all_contacts.some(
    (c) =>
      c.detected_by === 'BLUE' &&
      (c.confidence === 'low' || c.confidence === 'possible'),
  );
  if (hasLowConfidence) return SUGGESTION_PATTERNS.detection_confidence();
  if (!blueOrders?.platform_tasks?.length) return SUGGESTION_PATTERNS.tempo();
  return null;
}

export function observeTurn(
  profile: PlayerProfile,
  worldState: WorldState,
  blueOrders: Order | null,
  decisionTimeSec: number,
): PlayerProfile {
  const updated: PlayerProfile = {
    ...profile,
    total_turns_observed: profile.total_turns_observed + 1,
  };
  const underEW = worldState.blue_force.comms_status !== 'nominal';
  if (underEW) {
    updated.decision_speed_under_ew_sec = rollingMean(
      profile.decision_speed_under_ew_sec,
      decisionTimeSec,
      profile.total_turns_observed,
    );
  } else {
    updated.decision_speed_baseline_sec = rollingMean(
      profile.decision_speed_baseline_sec,
      decisionTimeSec,
      profile.total_turns_observed,
    );
  }

  const actedOnLowConfidence = !!blueOrders?.platform_tasks?.some((t) => {
    const contact = worldState.all_contacts.find((c) => c.contact_id === t.target_contact_id);
    return contact && (contact.confidence === 'low' || contact.confidence === 'possible');
  });

  if (actedOnLowConfidence) {
    updated.tactical_tendencies = recordTendency(profile.tactical_tendencies, {
      pattern: 'acts_on_low_confidence_contacts',
      description: 'Trainee committed assets against low-confidence contacts.',
      observed_frequency: 'observed',
      confidence: 0.5,
      exploit: '',
      sessions_observed: [worldState.exercise_id],
    });
  }

  return updated;
}

function rollingMean(current: number | null, sample: number, n: number): number {
  if (current === null || n <= 1) return sample;
  return Math.round((current * (n - 1) + sample) / n);
}

function recordTendency(
  existing: TacticalTendency[],
  observation: TacticalTendency,
): TacticalTendency[] {
  const match = existing.find((t) => t.pattern === observation.pattern);
  if (!match) return [...existing, observation];
  return existing.map((t) =>
    t.pattern === observation.pattern
      ? { ...t, confidence: Math.min(1, t.confidence + 0.1) }
      : t,
  );
}
