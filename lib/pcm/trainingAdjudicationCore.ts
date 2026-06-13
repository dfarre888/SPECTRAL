/**
 * SPECTRAL PCM — Training-tier pedagogical adjudication core.
 * OSINT platforms, magazine math, heuristic Pk via pcm-spectrum-bridge.
 * Not strike-planning grade — suitable for IRON CROW teaching.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationCore } from '@/lib/pcm/adjudicationCore';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import { createSeededRng } from '@/lib/pcm/seeded-rng';
import {
  adjudicatePcmPair,
  estimateGridRangeKm,
  gridRef,
} from '@/lib/pcm/pcm-spectrum-bridge';
import { evaluateOutcome } from '@/lib/pcm/turn-logic';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type Platform = PCM.Platform;
type AdjudicationEvent = PCM.AdjudicationEvent;

const THREAT_GROUPS = new Set(['OWA', 'FPV', 'loitering_munition', 'decoy']);
const DEFENCE_GROUPS = new Set([
  'c_uas_defeat_kinetic',
  'c_uas_defeat_ew',
  'c_uas_defeat_dew',
]);

function cloneState(ws: WorldState): WorldState {
  return JSON.parse(JSON.stringify(ws)) as WorldState;
}

function findPlatform(force: PCM.ForceOrbat, id: string): Platform | undefined {
  return force.platforms.find((p) => p.id === id);
}

function isInboundThreat(p: Platform): boolean {
  if (p.status === 'destroyed') return false;
  return (
    THREAT_GROUPS.has(p.group) &&
    ['airborne_tasked', 'airborne_loiter', 'pre_launch'].includes(p.status)
  );
}

function isDefenceReady(p: Platform): boolean {
  return (
    DEFENCE_GROUPS.has(p.group) &&
    p.status !== 'destroyed' &&
    (p.status === 'ground_ready' || p.status === 'airborne_tasked')
  );
}

function activateThreats(state: WorldState, redOrders: Order | null): void {
  if (!redOrders?.platform_tasks?.length) return;
  for (const task of redOrders.platform_tasks) {
    const p = findPlatform(state.red_force, task.platform_id);
    if (p && p.status === 'pre_launch') {
      p.status = 'airborne_tasked';
      p.altitude_m = p.altitude_m ?? 200;
      state.red_force.platforms_active = (state.red_force.platforms_active || 0) + 0;
    }
  }
}

function refreshForceTotals(force: PCM.ForceOrbat): void {
  const active = force.platforms.filter(
    (p) => p.status !== 'destroyed' && p.status !== 'mission_complete',
  ).length;
  const destroyed = force.platforms.filter((p) => p.status === 'destroyed').length;
  force.platforms_active = active;
  force.platforms_destroyed = destroyed;
}

function refreshSensorPicture(state: WorldState): void {
  const red = fogOfWarEngine.generateSensorPicture(state, 'RED');
  const blue = fogOfWarEngine.generateSensorPicture(state, 'BLUE');
  state.all_contacts = [...red, ...blue];
}

export const trainingAdjudicationCore: AdjudicationCore = {
  resolveTurn(worldState, redOrders, blueOrders, seed) {
    const state = cloneState(worldState);
    const rng = createSeededRng(seed);
    const events: AdjudicationEvent[] = [];

    activateThreats(state, redOrders);

    const blueTasks = blueOrders?.platform_tasks ?? [];
    const threats = state.red_force.platforms.filter(isInboundThreat);
    const defenders = state.blue_force.platforms.filter(isDefenceReady);

    let interceptsFired = 0;

    for (const task of blueTasks) {
      if (!task.weapon_release && !task.target_contact_id) continue;

      const defender = findPlatform(state.blue_force, task.platform_id);
      if (!defender || !DEFENCE_GROUPS.has(defender.group)) continue;

      if (defender.group === 'c_uas_defeat_kinetic') {
        if ((state.blue_force.magazine_remaining ?? 0) <= 0) {
          events.push({
            event_id: `EVT-MAG-EMPTY-${state.turn}-${interceptsFired}`,
            type: 'intercept_fail',
            description: `${defender.type} attempted intercept but magazine is empty.`,
            affected_platform_ids: [defender.id],
            visible_to_red: false,
            visible_to_blue: true,
            visible_to_ds: true,
          });
          continue;
        }

        state.blue_force.magazine_remaining = Math.max(
          0,
          (state.blue_force.magazine_remaining ?? 0) - 1,
        );
        state.blue_force.magazine_expended = (state.blue_force.magazine_expended ?? 0) + 1;
        interceptsFired += 1;
      }

      let target: Platform | undefined;
      if (task.target_contact_id) {
        const contact = state.all_contacts.find(
          (c) => c.contact_id === task.target_contact_id && c.detected_by === 'BLUE',
        );
        if (contact) {
          target = findPlatform(state.red_force, contact.true_platform_id);
          if (contact.misclassified && target?.group === 'decoy') {
            events.push({
              event_id: `EVT-DECOY-${state.turn}-${interceptsFired}`,
              type: 'intercept_success',
              description: `Intercept expended on misclassified contact (${contact.classification}) — decoy absorbed kinetic round.`,
              affected_platform_ids: [defender.id],
              visible_to_red: false,
              visible_to_blue: true,
              visible_to_ds: true,
            });
            continue;
          }
        }
      }

      if (!target && task.target_grid) {
        target = threats.find((t) => gridRef(t) === task.target_grid);
      }
      if (!target) target = threats[0];
      if (!target) continue;

      const pair = adjudicatePcmPair(target, defender, null);
      const roll = rng();
      const success = roll < pair.combinedBlueSuccessPct / 100;

      if (success) {
        target.status = 'destroyed';
        target.quantity_remaining = 0;
        events.push({
          event_id: `EVT-INT-OK-${state.turn}-${target.id}`,
          type: 'intercept_success',
          description: `${defender.type} intercepted ${target.type} (Pk≈${pair.combinedBlueSuccessPct}%).`,
          affected_platform_ids: [target.id, defender.id],
          visible_to_red: false,
          visible_to_blue: true,
          visible_to_ds: true,
        });
      } else {
        events.push({
          event_id: `EVT-INT-FAIL-${state.turn}-${target.id}`,
          type: 'intercept_fail',
          description: `${defender.type} missed ${target.type} (Pk≈${pair.combinedBlueSuccessPct}%).`,
          affected_platform_ids: [target.id, defender.id],
          visible_to_red: true,
          visible_to_blue: true,
          visible_to_ds: true,
        });
      }
    }

    for (const threat of state.red_force.platforms.filter(isInboundThreat)) {
      if (threat.status === 'destroyed') continue;

      const blueC2Grid = state.blue_force.c2?.gcs_location ?? 'ALPHA-4';
      const rangeKm = estimateGridRangeKm(gridRef(threat), blueC2Grid);
      const tti = fogOfWarEngine.computeTimeToImpact(threat, rangeKm);

      if (tti !== null && tti <= 1) {
        const defended = defenders.some((d) => {
          const pk = adjudicatePcmPair(threat, d, null);
          return pk.inRange && pk.combinedBlueSuccessPct > 60;
        });

        if (!defended) {
          threat.status = 'mission_complete';
          const blueObj = state.objectives.find((o) => o.id === 'OBJ-BLUE-01');
          if (blueObj && blueObj.status === 'active') {
            blueObj.status = 'failed';
          }
          events.push({
            event_id: `EVT-IMPACT-${state.turn}-${threat.id}`,
            type: 'impact',
            description: `${threat.type} impacted Blue objective sector (${gridRef(threat)}).`,
            affected_platform_ids: [threat.id],
            visible_to_red: true,
            visible_to_blue: true,
            visible_to_ds: true,
          });
        }
      }
    }

    refreshForceTotals(state.red_force);
    refreshForceTotals(state.blue_force);
    refreshSensorPicture(state);

    state.outcome = evaluateOutcome(state);
    state.updated_at = new Date().toISOString();

    return { resolvedState: state, events };
  },
};
