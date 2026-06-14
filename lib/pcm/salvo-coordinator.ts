/**
 * Layered defence salvo coordinator — magazine allocation, best defender selection.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { adjudicatePcmPairFromCtx } from '@/lib/pcm/pcm-pair-adjudication';
import type { InboundQueueItem } from '@/lib/pcm/swarm-saturation';
import { computeThreatTti } from '@/lib/pcm/threat-kinematics';

type Platform = PCM.Platform;
type WorldState = PCM.WorldState;
type Order = PCM.Order;
type AdjudicationEvent = PCM.AdjudicationEvent;

const DEFENCE_GROUPS = new Set([
  'c_uas_defeat_kinetic',
  'c_uas_defeat_ew',
  'c_uas_defeat_dew',
]);

function defenderLayer(defender: Platform): number {
  if (defender.group === 'c_uas_defeat_ew') return 3;
  if (defender.group === 'c_uas_defeat_kinetic') return 2;
  if (defender.group === 'c_uas_defeat_dew') return 1;
  return 0;
}

function sortDefenders(defenders: Platform[]): Platform[] {
  return [...defenders].sort((a, b) => {
    const rangeDiff = (b.range_km ?? 0) - (a.range_km ?? 0);
    if (rangeDiff !== 0) return rangeDiff;
    return defenderLayer(b) - defenderLayer(a);
  });
}

function roeAllowsFire(
  state: WorldState,
  contactConfidence: PCM.ContactConfidence | null,
  taskAuthorizes: boolean,
): boolean {
  if (taskAuthorizes) return true;
  if (!contactConfidence) return true;
  const roe = state.roe as { weapons_free?: boolean } | undefined;
  if (roe?.weapons_free) return true;
  return contactConfidence !== 'low' && contactConfidence !== 'possible';
}

export interface SalvoResult {
  events: AdjudicationEvent[];
  interceptedThreatIds: Set<string>;
  leakers: number;
  magazineRemaining: number;
}

export function runSalvoCoordinator(
  state: WorldState,
  queue: InboundQueueItem[],
  blueOrders: Order | null,
  defenders: Platform[],
  ctx: AdjudicationContext,
  rng: () => number,
): SalvoResult {
  const events: AdjudicationEvent[] = [];
  const interceptedThreatIds = new Set<string>();
  let magazine = state.blue_force.magazine_remaining ?? 0;
  const spentDefendersThisThreat = new Map<string, Set<string>>();
  const sortedDefenders = sortDefenders(defenders.filter((d) => d.status !== 'destroyed'));

  const blueTasks = blueOrders?.platform_tasks ?? [];
  const preferredDefender = blueTasks[0]?.platform_id;
  const preferredContact = blueTasks[0]?.target_contact_id;
  const taskAuthorizes = !!blueTasks[0]?.weapon_release;

  for (const item of queue) {
    const { threat, contactConfidence, isDecoy } = item;
    if (threat.status === 'destroyed') {
      interceptedThreatIds.add(threat.id);
      continue;
    }

    if (preferredContact) {
      const targetedContact = state.all_contacts.find(
        (c) => c.contact_id === preferredContact,
      );
      if (targetedContact && targetedContact.true_platform_id !== threat.id) {
        continue;
      }
    }

    if (!roeAllowsFire(state, contactConfidence, taskAuthorizes)) continue;

    let fired = false;
    const defenderOrder = preferredDefender
      ? [
          ...sortedDefenders.filter((d) => d.id === preferredDefender),
          ...sortedDefenders.filter((d) => d.id !== preferredDefender),
        ]
      : sortedDefenders;

    for (const defender of defenderOrder) {
      if (!DEFENCE_GROUPS.has(defender.group)) continue;

      const spent = spentDefendersThisThreat.get(threat.id) ?? new Set<string>();
      if (spent.has(defender.id)) continue;

      if (defender.group === 'c_uas_defeat_kinetic') {
        if (magazine <= 0) {
          events.push({
            event_id: `EVT-MAG-EMPTY-${state.turn}-${threat.id}`,
            type: 'intercept_fail',
            description: `Magazine empty — cannot engage ${threat.type}.`,
            affected_platform_ids: [defender.id],
            visible_to_red: false,
            visible_to_blue: true,
            visible_to_ds: true,
          });
          break;
        }
      }

      if (preferredContact) {
        const contact = state.all_contacts.find((c) => c.contact_id === preferredContact);
        if (contact?.misclassified && isDecoy) {
          magazine = Math.max(0, magazine - 1);
          state.blue_force.magazine_remaining = magazine;
          state.blue_force.magazine_expended = (state.blue_force.magazine_expended ?? 0) + 1;
          events.push({
            event_id: `EVT-DECOY-${state.turn}-${threat.id}`,
            type: 'intercept_success',
            description: `Kinetic round expended on misclassified decoy contact.`,
            affected_platform_ids: [defender.id],
            visible_to_red: false,
            visible_to_blue: true,
            visible_to_ds: true,
          });
          fired = true;
          break;
        }
      }

      const pair = adjudicatePcmPairFromCtx(ctx, threat, defender, state);
      if (!pair.inRange || pair.isImmune) continue;

      if (defender.group === 'c_uas_defeat_kinetic') {
        magazine = Math.max(0, magazine - 1);
        state.blue_force.magazine_remaining = magazine;
        state.blue_force.magazine_expended = (state.blue_force.magazine_expended ?? 0) + 1;
      }

      spent.add(defender.id);
      spentDefendersThisThreat.set(threat.id, spent);

      const roll = rng();
      const success = roll < pair.combinedBlueSuccessPct / 100;

      if (success) {
        threat.status = 'destroyed';
        threat.quantity_remaining = 0;
        interceptedThreatIds.add(threat.id);
        events.push({
          event_id: `EVT-INT-OK-${state.turn}-${threat.id}`,
          type: 'intercept_success',
          description: `${defender.type} intercepted ${threat.type} (Pk≈${pair.combinedBlueSuccessPct}%).`,
          affected_platform_ids: [threat.id, defender.id],
          visible_to_red: false,
          visible_to_blue: true,
          visible_to_ds: true,
        });
      } else {
        events.push({
          event_id: `EVT-INT-FAIL-${state.turn}-${threat.id}`,
          type: 'intercept_fail',
          description: `${defender.type} missed ${threat.type} (Pk≈${pair.combinedBlueSuccessPct}%).`,
          affected_platform_ids: [threat.id, defender.id],
          visible_to_red: true,
          visible_to_blue: true,
          visible_to_ds: true,
        });
      }
      fired = true;
      break;
    }

    if (!fired && magazine <= 0 && item.tti <= 1) {
      // leaker — handled in impact phase
    }
  }

  state.blue_force.magazine_remaining = magazine;

  const leakers = queue.filter(
    (q) => !interceptedThreatIds.has(q.threat.id) && q.threat.status !== 'destroyed',
  ).length;

  return { events, interceptedThreatIds, leakers, magazineRemaining: magazine };
}

export function resolveImpacts(
  state: WorldState,
  queue: InboundQueueItem[],
  interceptedIds: Set<string>,
  rng: () => number,
): AdjudicationEvent[] {
  const events: AdjudicationEvent[] = [];
  const blueC2 = state.blue_force.c2?.gcs_location ?? 'ALPHA-4';

  for (const item of queue) {
    const { threat } = item;
    if (threat.status === 'destroyed' || interceptedIds.has(threat.id)) continue;

    const tti = computeThreatTti(threat, blueC2);
    if (tti === null || tti > 0) continue;

    threat.status = 'mission_complete';
    const blueObj = state.objectives.find((o) => o.id === 'OBJ-BLUE-01');
    if (blueObj && blueObj.status === 'active') {
      blueObj.status = 'failed';
    }

    const redObj = state.objectives.find((o) => o.id === 'OBJ-RED-01');
    if (redObj && blueObj?.status === 'failed' && redObj.status === 'active') {
      redObj.status = 'succeeded';
    }

    events.push({
      event_id: `EVT-IMPACT-${state.turn}-${threat.id}`,
      type: 'impact',
      description: `${threat.type} impacted Blue objective sector (TTI=0).`,
      affected_platform_ids: [threat.id],
      visible_to_red: true,
      visible_to_blue: true,
      visible_to_ds: true,
    });
  }

  return events;
}

export function computeBlueWinProbability(
  state: WorldState,
  leakers: number,
): number {
  const mag = state.blue_force.magazine_remaining ?? 0;
  const blueObjFailed = state.objectives.some(
    (o) => o.force === 'BLUE' && o.status === 'failed',
  );
  if (blueObjFailed) return 0.15;
  if (leakers > 10) return 0.25;
  if (mag <= 0 && leakers > 0) return 0.3;
  return Math.min(0.85, 0.5 + mag * 0.02 - leakers * 0.01);
}
