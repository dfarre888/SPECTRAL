/**
 * SPECTRAL PCM Phase 1 — pure turn progression helpers (no Supabase).
 */

import type { PCM } from '@/lib/pcm/spectral.types';

export function calculateTimeOfDay(minutesElapsed: number): PCM.TimeOfDay {
  const hourOfDay = (6 + Math.floor(minutesElapsed / 60)) % 24;
  if (hourOfDay >= 5 && hourOfDay < 7) return 'dawn';
  if (hourOfDay >= 7 && hourOfDay < 12) return 'morning';
  if (hourOfDay >= 12 && hourOfDay < 14) return 'midday';
  if (hourOfDay >= 14 && hourOfDay < 18) return 'afternoon';
  if (hourOfDay >= 18 && hourOfDay < 20) return 'dusk';
  if (hourOfDay >= 20 && hourOfDay < 21) return 'night_transition';
  if (hourOfDay >= 21 || hourOfDay < 4) return 'night';
  return 'pre_dawn';
}

export function calculatePhase(turn: number, maxTurns: number): PCM.ExercisePhase {
  const pct = turn / maxTurns;
  if (pct < 0.15) return 'permissive';
  if (pct < 0.5) return 'contested';
  if (pct < 0.85) return 'denied';
  return 'culminating';
}

export function evaluateOutcome(worldState: PCM.WorldState): PCM.TurnOutcome {
  if (!worldState.objectives?.length) return 'continues';

  const blueObjectives = worldState.objectives.filter(
    (o) => o.force === 'BLUE' || o.force === 'both',
  );
  const redObjectives = worldState.objectives.filter(
    (o) => o.force === 'RED' || o.force === 'both',
  );

  const blueSucceeded = blueObjectives.every((o) => o.status === 'succeeded');
  const redSucceeded = redObjectives.every((o) => o.status === 'succeeded');
  const blueFailed = blueObjectives.some((o) => o.status === 'failed');
  const redFailed = redObjectives.some((o) => o.status === 'failed');

  if (blueSucceeded && !redSucceeded) return 'blue_wins';
  if (redSucceeded && !blueSucceeded) return 'red_wins';
  if (blueFailed && !redFailed) return 'red_wins';
  if (redFailed && !blueFailed) return 'blue_wins';
  if (worldState.turn >= worldState.max_turns) return 'stalemate';

  return 'continues';
}

/** Red objective hooks — logistics degradation via impacts and magazine exhaustion. */
export function evaluateRedObjectiveProgress(
  worldState: PCM.WorldState,
  leakers: number,
): void {
  const redObj = worldState.objectives.find((o) => o.id === 'OBJ-RED-01');
  const blueObj = worldState.objectives.find((o) => o.id === 'OBJ-BLUE-01');
  if (!redObj || redObj.status !== 'active') return;

  if (blueObj?.status === 'failed') {
    redObj.status = 'succeeded';
    return;
  }

  const magEmpty = (worldState.blue_force.magazine_remaining ?? 0) <= 0;
  if (magEmpty && leakers >= 6) {
    redObj.status = 'succeeded';
  }
}

export function classifyPlatformGroup(group: string): string {
  const classifications: Record<string, string> = {
    MALE_strike: 'MALE_UAV',
    MALE_isr: 'MALE_UAV',
    HALE_isr: 'HALE_UAV',
    UCAV: 'UCAV',
    CCA: 'UCAV',
    USV: 'SURFACE_VESSEL',
    EW: 'unknown_ground',
    c_uas_detect: 'ground_sensor',
    c_uas_defeat_kinetic: 'ground_launcher',
    c_uas_defeat_ew: 'EW_emitter',
  };
  return classifications[group] || 'unknown_air';
}
