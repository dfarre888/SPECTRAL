/**
 * EW combat resolution — Blue jam tasks, Red Krasukha comms degradation.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { adjudicatePcmPairFromCtx } from '@/lib/pcm/pcm-pair-adjudication';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type AdjudicationEvent = PCM.AdjudicationEvent;

function findPlatform(force: PCM.ForceOrbat, id: string) {
  return force.platforms.find((p) => p.id === id);
}

export interface EwCombatResult {
  events: AdjudicationEvent[];
  ewInterceptPenalty: number;
}

export function resolveEwCombat(
  state: WorldState,
  blueOrders: Order | null,
  ctx: AdjudicationContext,
  rng: () => number,
): EwCombatResult {
  const events: AdjudicationEvent[] = [];
  let ewInterceptPenalty = ctx.ewInterceptPenalty;

  const activeRedEw = state.red_force.ew_assets.filter((a) => a.status === 'active');
  if (activeRedEw.length > 0) {
    ewInterceptPenalty = Math.min(0.4, ewInterceptPenalty + activeRedEw.length * 0.08);
    const linkDrop = Math.min(40, activeRedEw.length * 12);
    state.blue_force.c2.link_health_percent = Math.max(
      20,
      (state.blue_force.c2.link_health_percent ?? 85) - linkDrop,
    );
    if (state.blue_force.c2.link_health_percent < 60) {
      state.blue_force.comms_status = 'degraded_light';
      state.blue_force.c2.comms_status = 'degraded_light';
      events.push({
        event_id: `EVT-COMMS-${state.turn}`,
        type: 'comms_degradation',
        description: `Red EW pressure degraded Blue C2 link to ${state.blue_force.c2.link_health_percent}%.`,
        affected_platform_ids: [],
        visible_to_red: true,
        visible_to_blue: true,
        visible_to_ds: true,
      });
    }
  }

  const tasks = blueOrders?.platform_tasks ?? [];
  for (const task of tasks) {
    const defender = findPlatform(state.blue_force, task.platform_id);
    if (!defender || defender.group !== 'c_uas_defeat_ew') continue;
    if (!task.weapon_release && !task.target_contact_id) continue;

    let target = state.red_force.platforms.find((p) => p.status === 'airborne_tasked');
    if (task.target_contact_id) {
      const contact = state.all_contacts.find(
        (c) => c.contact_id === task.target_contact_id && c.detected_by === 'BLUE',
      );
      if (contact) {
        target = findPlatform(state.red_force, contact.true_platform_id) ?? target;
      }
    }
    if (!target) continue;

    const pair = adjudicatePcmPairFromCtx(ctx, target, defender, state);
    const roll = rng();
    const success = roll < pair.combinedBlueSuccessPct / 100;

    if (success) {
      if (!target.ew_immune) {
        target.status = 'mission_complete';
      }
      events.push({
        event_id: `EVT-EW-OK-${state.turn}-${target.id}`,
        type: 'ew_effect',
        description: `${defender.type} jammed ${target.type} datalink (soft-kill Pk≈${pair.combinedBlueSuccessPct}%).`,
        affected_platform_ids: [target.id, defender.id],
        visible_to_red: false,
        visible_to_blue: true,
        visible_to_ds: true,
      });
    } else {
      events.push({
        event_id: `EVT-EW-FAIL-${state.turn}-${target.id}`,
        type: 'ew_effect',
        description: `${defender.type} failed to jam ${target.type}.`,
        affected_platform_ids: [target.id, defender.id],
        visible_to_red: true,
        visible_to_blue: true,
        visible_to_ds: true,
      });
    }
  }

  return { events, ewInterceptPenalty };
}
