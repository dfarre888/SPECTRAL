/**
 * Red Force order resolution — launches, strikes, EW, decoys.
 *
 * Adaptive AI integration:
 * If state.red_force.ai_state is present (populated by worldStateEngine after
 * each turn's adjudication), it is used to reorder the pre-launch platform pool
 * before wave budget allocation. This causes Red to naturally weight toward the
 * sector/group combination that has had the lowest Blue intercept rate over the
 * recent turn window.
 *
 * Red EW pressure (ewPressure) is no longer a flat +0.12 per Krasukha activation.
 * The returned ewPressure feeds into ctx.ewInterceptPenalty in the NEXT turn via
 * AdjudicationContext — the actual penalty model lives in ew-combat-resolver.ts
 * which reads from the preloaded pair cache. This resolver now emits ewPressure as
 * a signal only; the propagation-accurate penalty is computed downstream.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { defaultAltitudeForGroup } from '@/lib/pcm/threat-kinematics';
import { gridRef } from '@/lib/pcm/pcm-spectrum-bridge';
import {
  type RedAdaptiveState,
  applyRedAiOrdering,
  buildRedAiDiagnostic,
} from '@/lib/pcm/red-adaptive-ai';

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
  /** Aggregate EW pressure signal (0–0.35). Downstream resolver converts to per-pair penalty. */
  ewPressure: number;
}

/**
 * Open-build offensive Pk table — used ONLY when no pair-cache result is available
 * (e.g. loitering munition strike on a non-EW target outside the pairing model).
 * These values are conservative OSINT proxies, not accredited lethality data.
 */
const OFFENSIVE_PK_OSINT_PROXY: Record<string, number> = {
  loitering_munition: 50,
  FPV: 38,
  MALE_strike: 32,
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

  // ── Adaptive AI: reorder the pre-launch pool before budget allocation ──────
  const aiState = (state.red_force as unknown as Record<string, unknown>).ai_state as RedAdaptiveState | undefined;
  if (aiState && aiState.history.length > 0) {
    const preLaunch = state.red_force.platforms.filter(
      (p) => p.status === 'pre_launch' && OFFENSIVE_GROUPS.has(p.group),
    );
    const ordered = applyRedAiOrdering(preLaunch, aiState);
    // Rebuild platform_tasks order to match the AI-preferred pool ordering.
    // Platform IDs in the ordered array become the front of the task queue.
    const orderedIds = new Set(ordered.map((p) => p.id));
    redOrders.platform_tasks.sort((a, b) => {
      const aIsPreferred = orderedIds.has(a.platform_id) ? 0 : 1;
      const bIsPreferred = orderedIds.has(b.platform_id) ? 0 : 1;
      if (aIsPreferred !== bIsPreferred) return aIsPreferred - bIsPreferred;
      return a.priority - b.priority;
    });

    // DS-visible diagnostic event showing Red's learned strategy.
    const diag = buildRedAiDiagnostic(aiState, state.turn);
    events.push({
      event_id: `EVT-RED-AI-${state.turn}`,
      type: 'ew_effect', // closest existing type — treated as DS-only intel event
      description: `[RED AI] ${diag.reasoning}`,
      affected_platform_ids: [],
      visible_to_red: false,
      visible_to_blue: false,
      visible_to_ds: true,
    });
  }

  // ── Wave budget: increased if EW-immune strategy is active ────────────────
  const baseWaveBudget = aiState?.ewImmuneStrategyActive ? 10 : 8;
  let waveBudget = baseWaveBudget;

  for (const task of redOrders.platform_tasks.sort((a, b) => a.priority - b.priority)) {
    const p = findPlatform(state.red_force, task.platform_id);
    if (!p) continue;

    // ── Launch pre-launch platforms ──────────────────────────────────────────
    if (p.status === 'pre_launch' && OFFENSIVE_GROUPS.has(p.group)) {
      if (isWaveTask(task.task) && waveBudget <= 0) continue;
      p.status = p.group === 'loitering_munition' ? 'airborne_loiter' : 'airborne_tasked';
      p.altitude_m = p.altitude_m ?? defaultAltitudeForGroup(p.group);
      if (isWaveTask(task.task)) waveBudget -= 1;
      events.push({
        event_id: `EVT-RED-LAUNCH-${state.turn}-${p.id}`,
        type: 'weapon_release',
        description: `${p.type} launched — ${task.task}${p.ew_immune ? ' [EW-IMMUNE]' : ''}`,
        affected_platform_ids: [p.id],
        visible_to_red: true,
        visible_to_blue: false,
        visible_to_ds: true,
      });
    }

    // ── Loitering munition strike ────────────────────────────────────────────
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
        // OSINT proxy Pk — conservative open-build value.
        const redPk = OFFENSIVE_PK_OSINT_PROXY[p.group] ?? 45;
        const hit = rng() < redPk / 100;
        if (hit) {
          target.status = 'destroyed';
          target.quantity_remaining = 0;
          events.push({
            event_id: `EVT-RED-STRIKE-${state.turn}-${target.id}`,
            type: 'platform_destroyed',
            description: `${p.type} struck ${target.type} (OSINT proxy Pk≈${redPk}%).`,
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

    // ── EW activation ────────────────────────────────────────────────────────
    // ewPressure here is a SIGNAL to the next turn's AdjudicationContext.
    // The actual intercept penalty is computed from the pair cache in
    // ew-combat-resolver.ts — this flat accumulation is NOT the final penalty.
    if (/krasukha|ew|jam/i.test(task.task) || task.weapon_release === 'ew_jam') {
      const ew = state.red_force.ew_assets.find(
        (a) => a.id === task.platform_id || a.type.includes('Krasukha'),
      );
      if (ew) {
        ew.status = 'active';
        ew.affected_platform_ids = state.blue_force.platforms.map((bp) => bp.id);
        // Accumulate pressure signal — capped at 0.35, used as ctx.ewInterceptPenalty seed.
        ewPressure = Math.min(0.35, ewPressure + 0.10);
        events.push({
          event_id: `EVT-RED-EW-${state.turn}-${ew.id}`,
          type: 'ew_effect',
          description:
            `${ew.type} active — spectrum suppression engaged ` +
            `(pressure signal ${Math.round(ewPressure * 100)}%, ` +
            `propagation-accurate penalty computed in adjudication).`,
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
