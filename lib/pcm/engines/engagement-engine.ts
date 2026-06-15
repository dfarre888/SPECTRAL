/**
 * PCM engagement phase — salvo, EW, impacts, kinematics.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { resolveRedOrders } from '@/lib/pcm/red-order-resolver';
import { advanceAllInboundThreats } from '@/lib/pcm/threat-kinematics';
import {
  buildInboundQueue,
  isInboundThreat,
  applyWaveActivation,
} from '@/lib/pcm/swarm-saturation';
import {
  runSalvoCoordinator,
  resolveImpacts,
  type SalvoResult,
} from '@/lib/pcm/salvo-coordinator';
import { resolveEwCombat } from '@/lib/pcm/ew-combat-resolver';
import { evaluateRedObjectiveProgress } from '@/lib/pcm/turn-logic';

export interface EngagementPhaseResult {
  events: PCM.AdjudicationEvent[];
  salvo: SalvoResult;
}

export function runEngagementPhase(
  state: PCM.WorldState,
  redOrders: PCM.Order | null,
  blueOrders: PCM.Order | null,
  ctx: AdjudicationContext,
  rng: () => number,
): EngagementPhaseResult {
  const events: PCM.AdjudicationEvent[] = [];
  const turnMinutes = ctx.turnMinutes || 15;
  const blueC2 = state.blue_force.c2?.gcs_location ?? 'ALPHA-4';

  const waveActivated = applyWaveActivation(state, 8);
  if (waveActivated > 0) {
    events.push({
      event_id: `EVT-WAVE-${state.turn}`,
      type: 'weapon_release',
      description: `Red wave activated ${waveActivated} platforms inbound.`,
      affected_platform_ids: [],
      visible_to_red: true,
      visible_to_blue: false,
      visible_to_ds: true,
    });
  }

  const redResult = resolveRedOrders(state, redOrders, ctx, rng);
  events.push(...redResult.events);
  ctx.ewInterceptPenalty = redResult.ewPressure;

  const DEFENCE_GROUPS = new Set([
    'c_uas_defeat_kinetic',
    'c_uas_defeat_ew',
    'c_uas_defeat_dew',
  ]);
  const defenders = state.blue_force.platforms.filter(
    (p) =>
      DEFENCE_GROUPS.has(p.group) &&
      p.status !== 'destroyed' &&
      (p.status === 'ground_ready' || p.status === 'airborne_tasked'),
  );
  const queue = buildInboundQueue(state, redOrders);

  const salvo = runSalvoCoordinator(state, queue, blueOrders, defenders, ctx, rng);
  events.push(...salvo.events);

  const ewResult = resolveEwCombat(state, blueOrders, ctx, rng);
  events.push(...ewResult.events);
  ctx.ewInterceptPenalty = ewResult.ewInterceptPenalty;

  events.push(...resolveImpacts(state, queue, salvo.interceptedThreatIds, rng));

  const inbound = state.red_force.platforms.filter(isInboundThreat);
  advanceAllInboundThreats(inbound, blueC2, turnMinutes);

  evaluateRedObjectiveProgress(state, salvo.leakers);

  return { events, salvo };
}
