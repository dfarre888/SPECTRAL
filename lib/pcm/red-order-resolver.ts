/**
 * Red Force order resolution — launches, strikes, EW, decoys.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { defaultAltitudeForGroup } from '@/lib/pcm/threat-kinematics';
import { gridRef } from '@/lib/pcm/pcm-spectrum-bridge';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type Platform = PCM.Platform;
type AdjudicationEvent = PCM.AdjudicationEvent;

const OFFENSIVE_GROUPS = new Set(['OWA', 'FPV', 'loitering_munition', 'decoy', 'MALE_strike', 'MALE_isr']);

function findPlatform(force: PCM.ForceOrbat, id: string): Platform | undefined {
  return force.platforms.find((p) => p.id === id);
}

function isWaveTask(task: string): boolean {
  return /wave|salvo|saturation|inbound|launch/i.test(task);
}

export interface RedOrderResult {
  events: AdjudicationEvent[];
  ewPressure: number;
}

const OFFENSIVE_PK: Record<string, number> = {
  loitering_munition: 55,
  FPV: 42,
  MALE_strike: 35,
};

export function resolveRedOrders(
  state: WorldState,
  redOrders: Order | null,
  _ctx: AdjudicationContext,
  rng: () => number,
): RedOrderResult {
  const events: AdjudicationEvent[] = [];
  let ewPressure = 0;

  if (!redOrders?.platform_tasks?.length) return { events, ewPressure };

  let waveBudget = 8;

  for (const task of redOrders.platform_tasks.sort((a, b) => a.priority - b.priority)) {
    const p = findPlatform(state.red_force, task.platform_id);
    if (!p) continue;

    if (p.status === 'pre_launch' && OFFENSIVE_GROUPS.has(p.group)) {
      if (isWaveTask(task.task) && waveBudget <= 0) continue;
      p.status = p.group === 'loitering_munition' ? 'airborne_loiter' : 'airborne_tasked';
      p.altitude_m = p.altitude_m ?? defaultAltitudeForGroup(p.group);
      if (isWaveTask(task.task)) waveBudget -= 1;
      events.push({
        event_id: `EVT-RED-LAUNCH-${state.turn}-${p.id}`,
        type: 'weapon_release',
        description: `${p.type} launched — ${task.task}`,
        affected_platform_ids: [p.id],
        visible_to_red: true,
        visible_to_blue: false,
        visible_to_ds: true,
      });
    }

    if (task.weapon_release && p.group === 'loitering_munition') {
      let target: Platform | undefined;
      if (task.target_contact_id) {
        const contact = state.all_contacts.find(
          (c) => c.contact_id === task.target_contact_id && c.detected_by === 'RED',
        );
        if (contact) target = findPlatform(state.blue_force, contact.true_platform_id);
      }
      if (!target && task.target_grid) {
        target = state.blue_force.platforms.find((bp) => gridRef(bp) === task.target_grid);
      }
      if (target && target.status !== 'destroyed') {
        const redPk = OFFENSIVE_PK[p.group] ?? 50;
        const hit = rng() < redPk / 100;
        if (hit) {
          target.status = 'destroyed';
          target.quantity_remaining = 0;
          events.push({
            event_id: `EVT-RED-STRIKE-${state.turn}-${target.id}`,
            type: 'platform_destroyed',
            description: `${p.type} struck ${target.type} (Red Pk≈${redPk}%).`,
            affected_platform_ids: [p.id, target.id],
            visible_to_red: true,
            visible_to_blue: true,
            visible_to_ds: true,
          });
        } else {
          events.push({
            event_id: `EVT-RED-MISS-${state.turn}-${target.id}`,
            type: 'intercept_fail',
            description: `${p.type} missed ${target.type}.`,
            affected_platform_ids: [p.id, target.id],
            visible_to_red: true,
            visible_to_blue: true,
            visible_to_ds: true,
          });
        }
      }
    }

    if (/krasukha|ew|jam/i.test(task.task) || task.weapon_release === 'ew_jam') {
      const ew = state.red_force.ew_assets.find((a) => a.id === task.platform_id || a.type.includes('Krasukha'));
      if (ew) {
        ew.status = 'active';
        ew.affected_platform_ids = state.blue_force.platforms.map((bp) => bp.id);
        ewPressure = Math.min(0.35, ewPressure + 0.12);
        events.push({
          event_id: `EVT-RED-EW-${state.turn}-${ew.id}`,
          type: 'ew_effect',
          description: `${ew.type} active — Blue detection and intercept degraded.`,
          affected_platform_ids: [ew.id],
          visible_to_red: true,
          visible_to_blue: false,
          visible_to_ds: true,
        });
      }
    }
  }

  return { events, ewPressure };
}
