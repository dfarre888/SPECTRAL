/**
 * Layered defence salvo coordinator — magazine allocation, best defender selection.
 *
 * Layering model (updated):
 * True EW → kinetic → DEW sequencing. Each threat faces ALL available defender
 * layers in priority order. A defender only stops engaging a threat once it is
 * confirmed destroyed (added to interceptedThreatIds). EW and DEW remain in the
 * loop even when kinetic magazine is exhausted.
 *
 * This matches the C-UAS doctrine of outer (EW) / middle (kinetic) / terminal
 * (DEW) zones rather than collapsing to the first defender that fires.
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


function kineticAvailable(state: WorldState): boolean {
  const magByType = state.blue_force.magazine_by_type;
  if (magByType) return magByType.kinetic_interceptors > 0;
  return (state.blue_force.magazine_remaining ?? 0) > 0;
}

function dewAvailable(state: WorldState): boolean {
  const magByType = state.blue_force.magazine_by_type;
  if (magByType) return magByType.dew_charge_cycles > 0;
  return true;
}

function deductKineticRound(state: WorldState): number {
  const magByType = state.blue_force.magazine_by_type;
  if (magByType) {
    magByType.kinetic_interceptors = Math.max(0, magByType.kinetic_interceptors - 1);
    magByType.total_remaining = Math.max(0, magByType.total_remaining - 1);
    state.blue_force.magazine_remaining = magByType.total_remaining;
  } else {
    state.blue_force.magazine_remaining = Math.max(0, (state.blue_force.magazine_remaining ?? 0) - 1);
  }
  state.blue_force.magazine_expended = (state.blue_force.magazine_expended ?? 0) + 1;
  return state.blue_force.magazine_remaining ?? 0;
}

function deductDewCycle(state: WorldState): void {
  const magByType = state.blue_force.magazine_by_type;
  if (magByType) {
    magByType.dew_charge_cycles = Math.max(0, magByType.dew_charge_cycles - 1);
    magByType.total_remaining = Math.max(0, magByType.total_remaining - 1);
    state.blue_force.magazine_remaining = magByType.total_remaining;
  }
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

    const defenderOrder = preferredDefender
      ? [
          ...sortedDefenders.filter((d) => d.id === preferredDefender),
          ...sortedDefenders.filter((d) => d.id !== preferredDefender),
        ]
      : sortedDefenders;

    for (const defender of defenderOrder) {
      // If a prior layer already destroyed this threat, stop engaging it.
      if (interceptedThreatIds.has(threat.id)) break;

      if (!DEFENCE_GROUPS.has(defender.group)) continue;

      const spent = spentDefendersThisThreat.get(threat.id) ?? new Set<string>();
      if (spent.has(defender.id)) continue;

      // Kinetic magazine exhausted — skip THIS layer but continue to DEW/EW layers.
      if (defender.group === 'c_uas_defeat_kinetic' && !kineticAvailable(state)) {
        events.push({
          event_id: `EVT-MAG-EMPTY-${state.turn}-${threat.id}-${defender.id}`,
          type: 'intercept_fail',
          description: `Kinetic interceptors exhausted — Coyote/Stinger rounds depleted. Skipped ${threat.type}; DEW/EW layers continue.`,
          affected_platform_ids: [defender.id],
          visible_to_red: false,
          visible_to_blue: true,
          visible_to_ds: true,
        });
        continue; // ← continue, not break — DEW terminal layer may still engage
      }

      if (preferredContact) {
        const contact = state.all_contacts.find((c) => c.contact_id === preferredContact);
        if (contact?.misclassified && isDecoy) {
          magazine = deductKineticRound(state);
          events.push({
            event_id: `EVT-DECOY-${state.turn}-${threat.id}`,
            type: 'intercept_success',
            description: `Kinetic round expended on misclassified decoy contact.`,
            affected_platform_ids: [defender.id],
            visible_to_red: false,
            visible_to_blue: true,
            visible_to_ds: true,
          });
          break; // Wasted shot on decoy — stop pursuing this contact
        }
      }

      if (defender.group === 'c_uas_defeat_dew' && !dewAvailable(state)) {
        events.push({
          event_id: `EVT-DEW-EMPTY-${state.turn}-${threat.id}-${defender.id}`,
          type: 'intercept_fail',
          description: `DEW charge cycles exhausted — thermal/power limit reached for ${threat.type}.`,
          affected_platform_ids: [defender.id],
          visible_to_red: false,
          visible_to_blue: true,
          visible_to_ds: true,
        });
        continue;
      }

            const pair = adjudicatePcmPairFromCtx(ctx, threat, defender, state);
      if (!pair.inRange || pair.isImmune) continue;

      if (defender.group === 'c_uas_defeat_kinetic') {
        magazine = deductKineticRound(state);
      }
      if (defender.group === 'c_uas_defeat_dew') {
        deductDewCycle(state);
        magazine = state.blue_force.magazine_remaining ?? magazine;
      }

      spent.add(defender.id);
      spentDefendersThisThreat.set(threat.id, spent);

      const roll = rng();
      const pk = pair.combinedBlueSuccessPct;
      const success = roll < pk / 100;

      if (success) {
        // High-confidence Pk → destroy. Near-miss (low Pk roll) → degrade then check
        // accumulated damage (a degraded platform hit again is destroyed).
        if (pk >= 60 || threat.damage_state === 'degraded') {
          threat.status = 'destroyed';
          threat.damage_state = 'destroyed';
          threat.quantity_remaining = 0;
          interceptedThreatIds.add(threat.id);
          events.push({
            event_id: 'EVT-INT-OK-' + state.turn + '-' + threat.id,
            type: 'intercept_success',
            description:
              defender.type + ' destroyed ' + threat.type +
              ' (layer=' + defenderLayer(defender) + ', Pk~' + pk + '%).',
            affected_platform_ids: [threat.id, defender.id],
            visible_to_red: false,
            visible_to_blue: true,
            visible_to_ds: true,
          });
        } else {
          // Low-Pk success — damages but doesn't destroy; next layer still gets a shot.
          threat.damage_state = 'degraded';
          events.push({
            event_id: 'EVT-INT-OK-' + state.turn + '-' + threat.id,
            type: 'intercept_success',
            description:
              defender.type + ' damaged ' + threat.type +
              ' (layer=' + defenderLayer(defender) + ', Pk~' + pk + '% — degraded, next layer engages).',
            affected_platform_ids: [threat.id, defender.id],
            visible_to_red: false,
            visible_to_blue: true,
            visible_to_ds: true,
          });
          // Do NOT break — outer loop check handles destroyed state; degraded continues to next layer
        }
      } else {
        if (pk > 40) {
          threat.damage_state = 'degraded';
          threat.speed_kt = Math.round((threat.speed_kt ?? 100) * 0.7);
          events.push({
            event_id: 'EVT-DMG-' + state.turn + '-' + threat.id,
            type: 'platform_damaged',
            description:
              defender.type + ' near-miss on ' + threat.type +
              ' (layer=' + defenderLayer(defender) + ', Pk~' + pk + '%).',
            affected_platform_ids: [threat.id, defender.id],
            visible_to_red: true,
            visible_to_blue: true,
            visible_to_ds: true,
          });
        }
        events.push({
          event_id: 'EVT-INT-FAIL-' + state.turn + '-' + threat.id,
          type: 'intercept_fail',
          description:
            defender.type + ' missed ' + threat.type +
            ' (layer=' + defenderLayer(defender) + ', Pk~' + pk + '% — next layer).',
          affected_platform_ids: [threat.id, defender.id],
          visible_to_red: true,
          visible_to_blue: true,
          visible_to_ds: true,
        });
        // Miss — loop continues to next defender layer automatically
      }
      // ← No break here. The interceptedThreatIds check at the top of this loop
      //    handles early exit when a layer successfully destroys the threat.
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
