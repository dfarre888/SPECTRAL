/**
 * Red Force Adaptive AI — turn-memory vector learning.
 *
 * Principle: Red observes its own intercept loss rates per approach vector and
 * platform type each turn, then shifts subsequent wave composition toward the
 * combination that had the lowest Blue intercept success.
 *
 * Design goals vs US prime contractors:
 * - JTLS / JCATS: fixed Red scripted orders, no in-exercise adaptation
 * - OneSAF: reactive movement only, no TTP-level learning
 * - SPECTRAL: Red detects which vectors Blue is successfully defending,
 *   weights away from those, increases decoy ratio when Blue kinetics are winning,
 *   and recognises EW-immune (fibre-optic FPV) as a preferred mix component
 *   after observing SIGINT-transparent leakers.
 *
 * Open-build only — all learning is from adjudication outcomes, no accredited
 * lethality values are involved.
 *
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { PCM } from '@/lib/pcm/spectral.types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Outcome recorded at the end of one turn's adjudication. */
export interface RedTurnMemory {
  turn: number;
  /** Platform group → count of platforms launched this turn. */
  launchedByGroup: Record<string, number>;
  /** Platform group → count of platforms intercepted this turn. */
  interceptedByGroup: Record<string, number>;
  /** Approach grid sector → count of launches from that sector. */
  launchedBySector: Record<string, number>;
  /** Approach grid sector → count of intercepts in that sector. */
  interceptedBySector: Record<string, number>;
  /** Platforms that got through to target despite Blue EW (signals EW immunity). */
  ewImmuneLeakers: number;
  /** Magazine units Blue expended defending this turn. */
  blueKineticExpended: number;
}

/** Adaptive state persisted on state.red_force between turns. */
export interface RedAdaptiveState {
  /** Rolling history — last N_TURNS turns. */
  history: RedTurnMemory[];
  /** Sector to preferentially launch from next turn (lowest intercept rate). */
  preferredSector: string | null;
  /** Platform group to overweight in next wave allocation. */
  preferredGroup: string | null;
  /** Target decoy fraction for next wave (0–0.6). Increases when Blue kinetics are winning. */
  decoyRatioTarget: number;
  /** True once Red has observed EW-immune leakers getting through. */
  ewImmuneStrategyActive: boolean;
}

const N_TURNS = 3; // look-back window

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createRedAdaptiveState(): RedAdaptiveState {
  return {
    history: [],
    preferredSector: null,
    preferredGroup: null,
    decoyRatioTarget: 0.2,
    ewImmuneStrategyActive: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME RECORDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a RedTurnMemory from this turn's adjudication results.
 * Call this AFTER SpectralRefOrchestrator.adjudicateTurn() returns.
 */
export function buildTurnMemory(
  turn: number,
  redPlatforms: PCM.Platform[],
  interceptedIds: Set<string>,
  blueKineticExpended: number,
): RedTurnMemory {
  const launchedByGroup: Record<string, number> = {};
  const interceptedByGroup: Record<string, number> = {};
  const launchedBySector: Record<string, number> = {};
  const interceptedBySector: Record<string, number> = {};
  let ewImmuneLeakers = 0;

  for (const p of redPlatforms) {
    if (p.status !== 'airborne_tasked' && p.status !== 'destroyed' && p.status !== 'mission_complete') {
      continue;
    }

    const group = p.group ?? 'unknown';
    const sector = (Array.isArray(p.location_grid) ? p.location_grid[0] : p.location_grid) ?? 'UNKNOWN';

    launchedByGroup[group] = (launchedByGroup[group] ?? 0) + 1;
    launchedBySector[sector] = (launchedBySector[sector] ?? 0) + 1;

    if (interceptedIds.has(p.id)) {
      interceptedByGroup[group] = (interceptedByGroup[group] ?? 0) + 1;
      interceptedBySector[sector] = (interceptedBySector[sector] ?? 0) + 1;
    }

    // EW immune leaker: platform is fibre-optic guided AND was NOT intercepted by EW
    // (proxy: ew_immune flag present and platform reached mission_complete)
    if (p.ew_immune && p.status === 'mission_complete') {
      ewImmuneLeakers += 1;
    }
  }

  return {
    turn,
    launchedByGroup,
    interceptedByGroup,
    launchedBySector,
    interceptedBySector,
    ewImmuneLeakers,
    blueKineticExpended,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY ADAPTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a turn outcome and update Red's preferred vector/type for next turn.
 */
export function recordAndAdapt(
  aiState: RedAdaptiveState,
  memory: RedTurnMemory,
): void {
  aiState.history.push(memory);
  if (aiState.history.length > N_TURNS) aiState.history.shift();
  adaptStrategy(aiState);
}

function adaptStrategy(ai: RedAdaptiveState): void {
  if (ai.history.length === 0) return;

  // ── Sector preference ──────────────────────────────────────────────────────
  // Accumulate intercept rates per sector across the history window.
  const sectorLaunched: Record<string, number> = {};
  const sectorIntercepted: Record<string, number> = {};

  for (const mem of ai.history) {
    for (const [sector, count] of Object.entries(mem.launchedBySector)) {
      sectorLaunched[sector] = (sectorLaunched[sector] ?? 0) + count;
      sectorIntercepted[sector] =
        (sectorIntercepted[sector] ?? 0) + (mem.interceptedBySector[sector] ?? 0);
    }
  }

  const sectorRates = Object.entries(sectorLaunched).map(([sector, total]) => ({
    sector,
    rate: total > 0 ? (sectorIntercepted[sector] ?? 0) / total : 0,
  }));
  sectorRates.sort((a, b) => a.rate - b.rate);

  // Prefer the lowest-intercept sector, but only if we have enough data and
  // the rate is meaningfully better than random (< 60%).
  if (sectorRates.length > 0 && sectorRates[0].rate < 0.6) {
    ai.preferredSector = sectorRates[0].sector;
  } else {
    ai.preferredSector = null; // no meaningful preference
  }

  // ── Group preference ───────────────────────────────────────────────────────
  const groupLaunched: Record<string, number> = {};
  const groupIntercepted: Record<string, number> = {};

  for (const mem of ai.history) {
    for (const [group, count] of Object.entries(mem.launchedByGroup)) {
      groupLaunched[group] = (groupLaunched[group] ?? 0) + count;
      groupIntercepted[group] =
        (groupIntercepted[group] ?? 0) + (mem.interceptedByGroup[group] ?? 0);
    }
  }

  const groupRates = Object.entries(groupLaunched).map(([group, total]) => ({
    group,
    rate: total > 0 ? (groupIntercepted[group] ?? 0) / total : 0,
  }));
  groupRates.sort((a, b) => a.rate - b.rate);

  if (groupRates.length > 0) {
    ai.preferredGroup = groupRates[0].group;
  }

  // ── EW-immune strategy ─────────────────────────────────────────────────────
  const totalEwLeakers = ai.history.reduce((s, m) => s + m.ewImmuneLeakers, 0);
  if (totalEwLeakers >= 2) {
    // Red has observed fibre-optic FPVs getting through EW layers — activate
    // strategy to weight EW-immune platforms.
    ai.ewImmuneStrategyActive = true;
    ai.preferredGroup = 'FPV'; // EW-immune FPV mix
  }

  // ── Decoy ratio adaptation ─────────────────────────────────────────────────
  // If Blue kinetics are being heavily expended, Red benefits from more decoys
  // to exhaust the magazine further. If Blue kinetics are barely used (EW is
  // winning), decoys waste launch slots.
  const recentKineticExpended = ai.history
    .slice(-2)
    .reduce((s, m) => s + m.blueKineticExpended, 0);
  const recentLaunches = ai.history
    .slice(-2)
    .flatMap((m) => Object.values(m.launchedByGroup))
    .reduce((s, n) => s + n, 0);

  if (recentLaunches > 0) {
    const kineticPressureRatio = recentKineticExpended / recentLaunches;
    if (kineticPressureRatio > 0.6) {
      // Blue spending lots of kinetics per threat → increase decoys to drain faster
      ai.decoyRatioTarget = Math.min(0.55, ai.decoyRatioTarget + 0.08);
    } else if (kineticPressureRatio < 0.2) {
      // Blue not spending kinetics (EW is handling it) → decoys aren't helping
      ai.decoyRatioTarget = Math.max(0.10, ai.decoyRatioTarget - 0.05);
    }
    // Otherwise hold current ratio
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVE ORDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reorder pre-launch platforms to weight preferred sector and group at the front
 * of the wave batch. Does NOT change total platform count — allocation remains
 * the responsibility of resolveRedOrders().
 *
 * @param preLaunch All pre-launch Red platforms.
 * @param ai        Current adaptive state.
 * @returns         Platforms sorted with preferred attributes first.
 */
export function applyRedAiOrdering(
  preLaunch: PCM.Platform[],
  ai: RedAdaptiveState,
): PCM.Platform[] {
  return [...preLaunch].sort((a, b) => {
    const scoreA = platformScore(a, ai);
    const scoreB = platformScore(b, ai);
    return scoreB - scoreA; // descending — highest-preference first
  });
}

function platformScore(p: PCM.Platform, ai: RedAdaptiveState): number {
  let score = 0;
  const platformSector = Array.isArray(p.location_grid) ? p.location_grid[0] : p.location_grid;
  if (ai.preferredSector && platformSector === ai.preferredSector) score += 20;
  if (ai.preferredGroup && p.group === ai.preferredGroup) score += 15;
  if (ai.ewImmuneStrategyActive && p.ew_immune) score += 25;
  // Decoys get a relative boost when decoy ratio target is high
  if (p.group === 'decoy') score += Math.round(ai.decoyRatioTarget * 30);
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC SUMMARY  (visible to DS only)
// ─────────────────────────────────────────────────────────────────────────────

export interface RedAiDiagnostic {
  turn: number;
  preferredSector: string | null;
  preferredGroup: string | null;
  decoyRatioTarget: number;
  ewImmuneStrategyActive: boolean;
  reasoning: string;
}

export function buildRedAiDiagnostic(ai: RedAdaptiveState, turn: number): RedAiDiagnostic {
  const parts: string[] = [];
  if (ai.preferredSector) parts.push(`Preferring sector ${ai.preferredSector} (lowest intercept rate).`);
  if (ai.preferredGroup) parts.push(`Weighting ${ai.preferredGroup} platforms (lowest loss rate).`);
  if (ai.ewImmuneStrategyActive) parts.push(`EW-immune strategy active — fibre-optic leakers observed.`);
  parts.push(`Decoy ratio target: ${Math.round(ai.decoyRatioTarget * 100)}%.`);
  if (ai.history.length < N_TURNS) parts.push(`Building history (${ai.history.length}/${N_TURNS} turns).`);

  return {
    turn,
    preferredSector: ai.preferredSector,
    preferredGroup: ai.preferredGroup,
    decoyRatioTarget: ai.decoyRatioTarget,
    ewImmuneStrategyActive: ai.ewImmuneStrategyActive,
    reasoning: parts.join(' ') || 'No adaptation active — insufficient history.',
  };
}
