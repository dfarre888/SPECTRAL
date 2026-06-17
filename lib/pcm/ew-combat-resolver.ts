/**
 * EW combat resolution — Red EW pressure (pre-salvo), Blue jam tasks (post-salvo).
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { adjudicatePcmPairFromCtx } from '@/lib/pcm/pcm-pair-adjudication';
import { applyGnssSwarmDegradation, hasActiveLBandJamming } from '@/lib/pcm/swarm-saturation';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type AdjudicationEvent = PCM.AdjudicationEvent;
type EWAsset = PCM.EWAsset;

function findPlatform(force: PCM.ForceOrbat, id: string) {
  return force.platforms.find((p) => p.id === id);
}

function deriveRedEwPenalty(
  ctx: AdjudicationContext,
  activeRedEw: EWAsset[],
): { penalty: number; gateFraction: number; suppression: number } {
  const base = ctx.ewInterceptPenalty ?? 0;
  const count = activeRedEw.length;
  const penalty = Math.min(0.4, base + count * 0.08);
  const gateFraction = Math.min(0.35, count * 0.06);
  const suppression = Math.min(1, count * 0.12);
  return { penalty, gateFraction, suppression };
}

export interface EwCombatOptions {
  phase?: 'pre_salvo' | 'post_salvo';
}

export interface EwCombatResult {
  events: AdjudicationEvent[];
  ewInterceptPenalty: number;
  gnssSwarmDegradedCount: number;
}

function resolvePreSalvoRedEw(
  state: WorldState,
  ctx: AdjudicationContext,
  rng: () => number,
): EwCombatResult {
  const events: AdjudicationEvent[] = [];
  let ewInterceptPenalty = ctx.ewInterceptPenalty;
  let gnssSwarmDegradedCount = 0;

  const activeRedEw = state.red_force.ew_assets.filter((a) => a.status === 'active');
  if (activeRedEw.length === 0) {
    return { events, ewInterceptPenalty, gnssSwarmDegradedCount };
  }

  const rfModifier = state.weather.rf_propagation_modifier ?? 1.0;
  const { penalty, gateFraction, suppression } = deriveRedEwPenalty(ctx, activeRedEw);
  const weatherScaledPenalty = penalty * rfModifier;
  ewInterceptPenalty = Math.min(0.4, ewInterceptPenalty + weatherScaledPenalty);

  const effectiveSuppression = Math.min(1, gateFraction + suppression);
  const linkDrop = Math.min(
    35,
    Math.round(activeRedEw.length * 8 * (0.6 + effectiveSuppression * 0.4) * rfModifier),
  );

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
      description:
        `Red EW pressure degraded Blue C2 link to ${state.blue_force.c2.link_health_percent}% ` +
        `(rf_modifier=${Math.round(rfModifier * 100)}%).`,
      affected_platform_ids: [],
      visible_to_red: true,
      visible_to_blue: true,
      visible_to_ds: true,
    });
  }

  const swarmResult = applyGnssSwarmDegradation(state, activeRedEw, rng);
  events.push(...swarmResult.events);
  gnssSwarmDegradedCount = swarmResult.degradedCount;
  ctx.gnssSwarmDegradedCount = gnssSwarmDegradedCount;

  if (hasActiveLBandJamming(activeRedEw)) {
    const blueGnssPlatforms = state.blue_force.platforms.filter(
      (p) =>
        (p.guidance === 'GNSS_INS' || p.guidance === 'GNSS_INS_ATR') &&
        !p.ew_immune &&
        p.status !== 'destroyed',
    );

    for (const p of blueGnssPlatforms) {
      p.range_km = Math.max(1, Math.round((p.range_km ?? 10) * 0.75));
      p.damage_state = 'degraded';
    }

    if (blueGnssPlatforms.length > 0) {
      events.push({
        event_id: `EVT-BLUE-GNSS-DEG-${state.turn}`,
        type: 'ew_effect',
        description:
          `Red L-band jamming degrading Blue GNSS-guided system accuracy. ` +
          `${blueGnssPlatforms.length} platform(s) affected — CEP growth modelled as -25% effective range.`,
        affected_platform_ids: blueGnssPlatforms.map((p) => p.id),
        visible_to_red: false,
        visible_to_blue: true,
        visible_to_ds: true,
      });
    }
  }

  return { events, ewInterceptPenalty, gnssSwarmDegradedCount };
}

function resolvePostSalvoBlueJam(
  state: WorldState,
  blueOrders: Order | null,
  ctx: AdjudicationContext,
  rng: () => number,
  ewInterceptPenalty: number,
): EwCombatResult {
  const events: AdjudicationEvent[] = [];
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

  return { events, ewInterceptPenalty, gnssSwarmDegradedCount: ctx.gnssSwarmDegradedCount ?? 0 };
}

export function resolveEwCombat(
  state: WorldState,
  blueOrders: Order | null,
  ctx: AdjudicationContext,
  rng: () => number,
  options: EwCombatOptions = {},
): EwCombatResult {
  const phase = options.phase ?? 'pre_salvo';

  if (phase === 'pre_salvo') {
    return resolvePreSalvoRedEw(state, ctx, rng);
  }

  return resolvePostSalvoBlueJam(state, blueOrders, ctx, rng, ctx.ewInterceptPenalty);
}
