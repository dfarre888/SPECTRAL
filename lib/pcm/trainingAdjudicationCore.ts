/**
 * SPECTRAL PCM — Full combat adjudication core (extends training implementation).
 * OSINT defeat matrix, layered defence, swarm saturation, EW effects.
 * Edition-gated: Training grid physics | Operations buildings/terrain.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import type { AdjudicationCore } from '@/lib/pcm/adjudicationCore';
import type { AdjudicationContext } from '@/lib/pcm/adjudication-context';
import { DefeatMatrixCache } from '@/lib/pcm/defeat-matrix-lookup';
import { resolveRedOrders } from '@/lib/pcm/red-order-resolver';
import {
  advanceAllInboundThreats,
} from '@/lib/pcm/threat-kinematics';
import {
  buildInboundQueue,
  isInboundThreat,
  applyWaveActivation,
} from '@/lib/pcm/swarm-saturation';
import {
  runSalvoCoordinator,
  resolveImpacts,
  computeBlueWinProbability,
} from '@/lib/pcm/salvo-coordinator';
import { resolveEwCombat } from '@/lib/pcm/ew-combat-resolver';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import { createSeededRng } from '@/lib/pcm/seeded-rng';
import { evaluateOutcome, evaluateRedObjectiveProgress } from '@/lib/pcm/turn-logic';

type WorldState = PCM.WorldState;
type Order = PCM.Order;
type AdjudicationEvent = PCM.AdjudicationEvent;

const DEFENCE_GROUPS = new Set([
  'c_uas_defeat_kinetic',
  'c_uas_defeat_ew',
  'c_uas_defeat_dew',
]);

function cloneState(ws: WorldState): WorldState {
  return JSON.parse(JSON.stringify(ws)) as WorldState;
}

function isDefenceReady(p: PCM.Platform): boolean {
  return (
    DEFENCE_GROUPS.has(p.group) &&
    p.status !== 'destroyed' &&
    (p.status === 'ground_ready' || p.status === 'airborne_tasked')
  );
}

function refreshForceTotals(force: PCM.ForceOrbat): void {
  const active = force.platforms.filter(
    (p) => p.status !== 'destroyed' && p.status !== 'mission_complete',
  ).length;
  const destroyed = force.platforms.filter((p) => p.status === 'destroyed').length;
  force.platforms_active = active;
  force.platforms_destroyed = destroyed;
}

function defaultContext(seed: number): AdjudicationContext {
  return {
    defeatMatrix: DefeatMatrixCache.createOffline(),
    pairResults: new Map(),
    tenantId: null,
    turnMinutes: 15,
    ewInterceptPenalty: 0,
  };
}

/**
 * Adaptive Red Force — training-grade behaviour heuristics.
 * Modifies Red platform states after each turn based on cumulative battle
 * damage and Blue posture.  Three mechanisms (all deterministic / seeded):
 *
 *  1. Saturation surge  — activate reserve platforms when Red has taken >30%
 *     losses, flooding Blue defences before the next intercept window.
 *
 *  2. Altitude adaptation — descend inbound threats to a nap-of-earth profile
 *     (≥40 m AGL) when Blue EW systems are active, reducing exposure to
 *     the jammer's horizontal beam.
 *
 *  3. Bearing jitter — randomise the grid-row approach axis by ±2 squares
 *     from turn 3 onward, preventing Blue from pre-stacking interceptors on
 *     a single axis.
 *
 * All heuristics are OSINT-grade training behaviours only.
 */
function adaptRedForce(state: WorldState, seed: number): void {
  const turn = (state.turn as number | undefined) ?? 1;
  const redPlatforms = state.red_force.platforms;
  const activePlatforms = redPlatforms.filter(
    (p) => p.status !== 'destroyed' && p.status !== 'mission_complete',
  );
  if (activePlatforms.length === 0) return;

  const totalRed = redPlatforms.length;
  const destroyed = state.red_force.platforms_destroyed ?? 0;
  const lossRate = totalRed > 0 ? destroyed / totalRed : 0;
  const blueHasEw = state.blue_force.platforms.some((p) =>
    DEFENCE_GROUPS.has(p.group),
  );

  // 1 — Saturation surge on heavy losses
  if (lossRate > 0.3 && turn >= 2) {
    const reserves = activePlatforms.filter((p) => p.status === 'pre_launch');
    const surgeCount = Math.min(Math.ceil(reserves.length * 0.5), 4);
    reserves.slice(0, surgeCount).forEach((p) => {
      p.status = 'airborne_tasked';
    });
  }

  // 2 — Drop to NOE profile to reduce jammer exposure
  if (turn >= 3 && blueHasEw) {
    activePlatforms
      .filter((p) => p.status === 'airborne_tasked' && isInboundThreat(p))
      .forEach((p) => {
        p.altitude_m = Math.max(40, (p.altitude_m ?? 200) - 80);
      });
  }

  // 3 — Bearing jitter to deny Blue predictive stacking
  if (turn > 2) {
    const rng = createSeededRng(seed + 7919);
    activePlatforms
      .filter((p) => p.status === 'airborne_tasked' && p.location_grid)
      .forEach((p) => {
        const grid = typeof p.location_grid === 'string' ? p.location_grid : p.location_grid[0];
        if (!grid) return;
        const jitter = Math.round((rng() - 0.5) * 4);
        if (jitter === 0) return;
        const m = grid.match(/^([A-Z]+)(\d+)-(\d+)$/);
        if (m) {
          const newRow = Math.max(1, Math.min(20, parseInt(m[2], 10) + jitter));
          p.location_grid = `${m[1]}${newRow}-${m[3]}`;
        }
      });
  }
}

function resolveTurnInternal(
  worldState: WorldState,
  redOrders: Order | null,
  blueOrders: Order | null,
  seed: number,
  ctx?: AdjudicationContext,
): { resolvedState: WorldState; events: AdjudicationEvent[]; blueWinProbability: number } {
  const state = cloneState(worldState);
  const context = ctx ?? defaultContext(seed);
  const rng = createSeededRng(seed);
  const events: AdjudicationEvent[] = [];
  const turnMinutes = context.turnMinutes || 15;
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

  const redResult = resolveRedOrders(state, redOrders, context, rng);
  events.push(...redResult.events);
  context.ewInterceptPenalty = redResult.ewPressure;

  const defenders = state.blue_force.platforms.filter(isDefenceReady);
  const queue = buildInboundQueue(state, redOrders);

  const salvo = runSalvoCoordinator(state, queue, blueOrders, defenders, context, rng);
  events.push(...salvo.events);

  const ewResult = resolveEwCombat(state, blueOrders, context, rng);
  events.push(...ewResult.events);
  context.ewInterceptPenalty = ewResult.ewInterceptPenalty;

  events.push(...resolveImpacts(state, queue, salvo.interceptedThreatIds, rng));

  const inbound = state.red_force.platforms.filter(isInboundThreat);
  advanceAllInboundThreats(inbound, blueC2, turnMinutes);

  evaluateRedObjectiveProgress(state, salvo.leakers);

  refreshForceTotals(state.red_force);
  refreshForceTotals(state.blue_force);

  const sensorRng = createSeededRng(seed + 1);
  const red = fogOfWarEngine.generateSensorPicture(state, 'RED', { rng: sensorRng });
  const blue = fogOfWarEngine.generateSensorPicture(state, 'BLUE', { rng: sensorRng });
  state.all_contacts = [...red, ...blue];

  // Adaptive Red Force — adjust surviving Red platforms for the next turn
  // based on loss rate, Blue EW posture, and elapsed turn count.
  adaptRedForce(state, seed);

  state.outcome = evaluateOutcome(state);
  state.updated_at = new Date().toISOString();

  const blueWinProbability = computeBlueWinProbability(state, salvo.leakers);

  return { resolvedState: state, events, blueWinProbability };
}

export const trainingAdjudicationCore: AdjudicationCore = {
  resolveTurn(worldState, redOrders, blueOrders, seed, ctx) {
    return resolveTurnInternal(worldState, redOrders, blueOrders, seed, ctx);
  },
};

export { resolveTurnInternal };
