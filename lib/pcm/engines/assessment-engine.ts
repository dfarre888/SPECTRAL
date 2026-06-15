/**
 * PCM assessment phase — force totals, outcome, win probability.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import { computeBlueWinProbability, type SalvoResult } from '@/lib/pcm/salvo-coordinator';
import { evaluateOutcome } from '@/lib/pcm/turn-logic';

export function refreshForceTotals(force: PCM.ForceOrbat): void {
  const active = force.platforms.filter((p) => {
    if (p.status === 'destroyed' || p.status === 'mission_complete') return false;
    if (p.damage_state === 'destroyed') return false;
    return true;
  }).length;
  const destroyed = force.platforms.filter(
    (p) => p.status === 'destroyed' || p.damage_state === 'destroyed',
  ).length;
  force.platforms_active = active;
  force.platforms_destroyed = destroyed;
}

export interface AssessmentPhaseResult {
  blueWinProbability: number;
}

export function runAssessmentPhase(
  state: PCM.WorldState,
  salvoResult: SalvoResult,
): AssessmentPhaseResult {
  refreshForceTotals(state.red_force);
  refreshForceTotals(state.blue_force);

  state.outcome = evaluateOutcome(state);
  state.updated_at = new Date().toISOString();

  const blueWinProbability = computeBlueWinProbability(state, salvoResult.leakers);
  return { blueWinProbability };
}
