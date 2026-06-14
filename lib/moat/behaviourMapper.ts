/**
 * Maps PCM turn inputs to learner-model TurnObservation (safe profiling only).
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { TurnObservation, ObservedBehaviour } from '@/lib/moat/learnerModelEngine';
import { COMPETENCY_LIBRARY } from '@/lib/moat/learnerModel.types';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type AdjudicationEvent = PCM.AdjudicationEvent;

const INBOUND_GROUPS = new Set(['OWA', 'FPV', 'loitering_munition', 'decoy']);
const NIGHT_PHASES = new Set<PCM.TimeOfDay>(['night', 'night_transition', 'pre_dawn']);

function inboundThreatCount(state: WorldState): number {
  return state.red_force.platforms.filter(
    (p) =>
      INBOUND_GROUPS.has(p.group) &&
      ['airborne_tasked', 'airborne_loiter'].includes(p.status),
  ).length;
}

function decoyCount(state: WorldState): number {
  return state.red_force.platforms.filter(
    (p) => p.group === 'decoy' && p.status !== 'destroyed',
  ).length;
}

export function buildContextFlags(
  state: WorldState,
  events: AdjudicationEvent[],
): string[] {
  const flags: string[] = [];
  if (state.blue_force.comms_status !== 'nominal') flags.push('under_ew');
  if (inboundThreatCount(state) >= 8) flags.push('saturation');
  if (decoyCount(state) >= 2 || events.some((e) => e.description.includes('decoy'))) {
    flags.push('decoy_heavy');
  }
  if (NIGHT_PHASES.has(state.time_of_day)) flags.push('night');
  if (state.blue_force.comms_status === 'severed') flags.push('degraded_comms');
  return flags;
}

function actedOnLowConfidence(blueOrders: Order | null, state: WorldState): boolean {
  return !!blueOrders?.platform_tasks?.some((t) => {
    const contact = state.all_contacts.find((c) => c.contact_id === t.target_contact_id);
    return contact && (contact.confidence === 'low' || contact.confidence === 'possible');
  });
}

function firedOnMisclassifiedDecoy(events: AdjudicationEvent[]): boolean {
  return events.some(
    (e) =>
      e.type === 'intercept_success' && e.description.toLowerCase().includes('decoy'),
  );
}

function magazineWasted(events: AdjudicationEvent[], post: WorldState): boolean {
  if (firedOnMisclassifiedDecoy(events)) return true;
  const magEmpty = (post.blue_force.magazine_remaining ?? 0) <= 0;
  const leakers = post.red_force.platforms.filter(
    (p) =>
      INBOUND_GROUPS.has(p.group) &&
      p.status !== 'destroyed' &&
      p.status !== 'mission_complete',
  ).length;
  return magEmpty && leakers > 0;
}

function behaviour(
  competency: ObservedBehaviour['competency'],
  met: boolean,
  context: string,
): ObservedBehaviour {
  const lib = COMPETENCY_LIBRARY[competency];
  return {
    competency,
    behaviour: lib.observable_behaviours[0] ?? lib.title,
    met_standard: met,
    context,
  };
}

export function computeDecisionTimeSec(
  redOrders: Order | null,
  blueOrders: Order | null,
): number | null {
  const redTs = redOrders?.timestamp ? Date.parse(redOrders.timestamp) : NaN;
  const blueTs = blueOrders?.timestamp ? Date.parse(blueOrders.timestamp) : NaN;
  if (!Number.isFinite(redTs) || !Number.isFinite(blueTs) || blueTs < redTs) return null;
  return Math.round((blueTs - redTs) / 1000);
}

export function buildTurnObservation(
  exerciseId: string,
  preState: WorldState,
  postState: WorldState,
  blueOrders: Order | null,
  events: AdjudicationEvent[],
  decisionTimeSec: number | null,
  now: string,
): TurnObservation {
  const flags = buildContextFlags(postState, events);
  const contextLabel = flags.length ? flags.join(', ') : 'benign conditions';
  const behaviours: ObservedBehaviour[] = [];
  const hasTasks = (blueOrders?.platform_tasks?.length ?? 0) > 0;
  const inbound = inboundThreatCount(preState) > 0;
  const lowConfFire = actedOnLowConfidence(blueOrders, preState);
  const decoyWaste = firedOnMisclassifiedDecoy(events);

  behaviours.push(
    behaviour(
      'magazine_management',
      !magazineWasted(events, postState),
      `magazine state after turn — ${contextLabel}`,
    ),
  );

  behaviours.push(
    behaviour(
      'threat_classification',
      !decoyWaste && !lowConfFire,
      decoyWaste ? 'misclassified decoy engagement' : `classification under ${contextLabel}`,
    ),
  );

  if (flags.includes('under_ew') && inbound) {
    behaviours.push(
      behaviour(
        'decision_under_uncertainty',
        hasTasks,
        'under EW with inbound threats',
      ),
    );
  }

  if (inbound) {
    behaviours.push(
      behaviour(
        'tempo_and_initiative',
        hasTasks,
        hasTasks ? 'issued platform tasks' : 'no blue tasks with inbound threats',
      ),
    );
  }

  if (lowConfFire) {
    behaviours.push(
      behaviour(
        'roe_application',
        false,
        'committed against low-confidence contact',
      ),
    );
  } else if (hasTasks) {
    behaviours.push(
      behaviour(
        'roe_application',
        true,
        'engagement aligned with contact confidence',
      ),
    );
  }

  return {
    exercise_id: exerciseId,
    turn: postState.turn,
    timestamp: now,
    decision_time_sec: decisionTimeSec,
    context_flags: flags,
    behaviours,
  };
}
