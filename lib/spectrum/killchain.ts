/**
 * F3 kill-chain analysis — the static reasoning engine.
 * ------------------------------------------------------
 * Answers the planner's questions without time-stepping:
 *   - canEngage(effector, threat)  → can this shooter kill this target, and how well
 *   - effectorsAgainst(threat)     → ranked list of what can finish a given threat
 *   - killChainStatus(threat, blueRadars, blueEffectors) → Find/Fix/Finish completeness
 *   - coverageGaps(rings, route)   → where an ingress route is NOT covered (the seam)
 *
 * STATIC NOW: no flyout timing. DYNAMIC-SIM seams noted for the later sim layer.
 */

import type { Platform } from './types';
import type { RadarSystem, TargetClass } from './radar-types';
import type { EffectorSystem, EnvelopeRing, GeoPoint } from './effector-types';
import { ringsEngaging } from './effector-types';

/* ----------------------------- threat → target class ----------------------------- */

/** Map a platform to the radar/effector TargetClass taxonomy. */
export function platformTargetClass(p: Platform): TargetClass {
  const g = p.group ?? 5;
  const cat = (p.category ?? '').toLowerCase();
  if (cat.includes('cruise')) return 'cruise_missile';
  if (cat.includes('ballistic')) return 'ballistic_missile';
  if (g <= 2) return 'small_uas';
  return 'large_uas';
}

/* ----------------------------- FINISH: can this effector kill it ----------------------------- */

export interface EngageAssessment {
  effector: EffectorSystem;
  verdict: 'effective' | 'marginal' | 'cannot';
  reasons: string[];
  pk?: number | null;
  cost_exchange?: string | null; // economic note (drone cost vs interceptor cost)
}

export function canEngage(
  effector: EffectorSystem,
  threat: Platform,
  threatCostUsd = 50000
): EngageAssessment {
  const tc = platformTargetClass(threat);
  const reasons: string[] = [];

  // 1. can the effect physically defeat this target class?
  if (effector.cannot_defeat.includes(tc)) {
    return { effector, verdict: 'cannot', reasons: [`${effector.name} cannot defeat ${tc.replace('_', ' ')}`] };
  }
  if (!effector.defeats.includes(tc)) {
    return { effector, verdict: 'cannot', reasons: [`${tc.replace('_', ' ')} is outside ${effector.name}'s target set`] };
  }

  // 2. RF-silent / fibre-optic threats vs soft-kill effects
  const silent = (threat.capabilities ?? []).some((c) => (c.defeat_resistance ?? []).includes('rf_silent'));
  // (HPM still works on fibre-optic — it's the radar/RF *jammers* that fail; HPM fries electronics)

  // 3. effect-specific reasoning
  let verdict: EngageAssessment['verdict'] = 'effective';
  if (effector.effect === 'hpm') {
    reasons.push('HPM area effect — defeats swarms and fibre-optic/RF-silent drones regardless of datalink');
  } else if (effector.effect === 'laser') {
    reasons.push('Single-target dwell — effective but engages one threat at a time; weather-degraded');
    if (tc === 'small_uas' || tc === 'large_uas') reasons.push('Good vs drones; saturation requires fast re-slew');
  } else if (effector.effect === 'kinetic_missile') {
    // economic sanity: expensive interceptor vs cheap drone
    const cost = effector.cost_per_shot_usd ?? 0;
    if ((tc === 'small_uas' || tc === 'large_uas') && cost > threatCostUsd * 5) {
      verdict = 'marginal';
      reasons.push(`Capable but economically irrational: ~$${(cost / 1e6).toFixed(1)}M interceptor vs ~$${(threatCostUsd / 1e3).toFixed(0)}k drone`);
    } else {
      reasons.push('Kinetic hit-to-kill / blast-frag — high single-shot lethality');
    }
  } else if (effector.effect === 'kinetic_gun') {
    reasons.push('Gun — cheap per round but very short range (last-ditch)');
  } else if (effector.effect === 'kinetic_interceptor_drone') {
    reasons.push('Interceptor drone — hard-kill, expended per engagement');
  }

  const costNote =
    effector.cost_per_shot_usd != null
      ? `~$${effector.cost_per_shot_usd >= 1e6 ? (effector.cost_per_shot_usd / 1e6).toFixed(1) + 'M' : (effector.cost_per_shot_usd / 1e3).toFixed(0) + 'k'}/shot vs ~$${(threatCostUsd / 1e3).toFixed(0)}k threat`
      : null;

  return { effector, verdict, reasons, pk: effector.pk_estimate, cost_exchange: costNote };
}

/** Rank every effector against a threat, best-first. */
export function effectorsAgainst(
  threat: Platform,
  effectors: EffectorSystem[],
  side: 'blue' | 'red' = 'blue'
): EngageAssessment[] {
  const threatCost = estimateThreatCost(threat);
  return effectors
    .filter((e) => e.side === side)
    .map((e) => canEngage(e, threat, threatCost))
    .sort((a, b) => score(b) - score(a));
}

function score(a: EngageAssessment): number {
  const base = { effective: 3, marginal: 2, cannot: 0 }[a.verdict];
  return base * 10 + (a.pk ?? 0);
}

function estimateThreatCost(p: Platform): number {
  const g = p.group ?? 5;
  if (g <= 2) return 5000;       // FPV / small
  if (g === 3) return 50000;     // Shahed class
  return 2000000;                // large UAS / MALE
}

/* ----------------------------- FIND/FIX/FINISH completeness ----------------------------- */

export interface KillChainStatus {
  threat: Platform;
  find: { ok: boolean; radars: RadarSystem[]; note: string };
  fix: { ok: boolean; note: string };
  finish: { ok: boolean; effectors: EffectorSystem[]; note: string };
  summary: string;
  broken_link?: 'find' | 'fix' | 'finish' | null;
}

/**
 * Is there a complete Find→Fix→Finish chain against this threat with the
 * available Blue sensors and shooters? The classic break: you can FIND a small
 * drone (if you have a C-UAS radar) but can't FINISH it economically, or you
 * can FINISH but can't FIND a fibre-optic FPV until it's visual.
 */
export function killChainStatus(
  threat: Platform,
  radars: RadarSystem[],
  effectors: EffectorSystem[],
  side: 'blue' | 'red' = 'blue'
): KillChainStatus {
  const tc = platformTargetClass(threat);

  // FIND — which sensors detect this class?
  const finders = radars.filter((r) => r.side === side && r.can_detect.includes(tc));
  const findOk = finders.length > 0;

  // FIX — track quality. A find with at least one fire-control-capable radar = fix.
  const fixCapable = finders.some((r) =>
    ['engagement', 'multifunction', 'counter_uas', 'airborne_fire_control', 'naval_multifunction'].includes(r.role)
  );

  // FINISH — which effectors can engage, effectively or marginally?
  const shooters = effectorsAgainst(threat, effectors, side).filter((a) => a.verdict !== 'cannot');
  const finishOk = shooters.length > 0;
  const effectiveShooters = shooters.filter((a) => a.verdict === 'effective').map((a) => a.effector);
  const finishList = (effectiveShooters.length ? effectiveShooters : shooters.map((a) => a.effector)).slice(0, 4);

  let broken: KillChainStatus['broken_link'] = null;
  if (!findOk) broken = 'find';
  else if (!fixCapable) broken = 'fix';
  else if (!finishOk) broken = 'finish';

  const summary = broken
    ? `Broken at ${broken.toUpperCase()}: ${
        broken === 'find'
          ? `no ${side} sensor detects ${tc.replace('_', ' ')} — it penetrates unseen`
          : broken === 'fix'
          ? `detected but no fire-control-quality track — cue only, can't guide a shot`
          : `tracked but nothing can finish it effectively`
      }`
    : `Complete Find→Fix→Finish chain against ${threat.name}`;

  return {
    threat,
    find: {
      ok: findOk,
      radars: finders.slice(0, 4),
      note: findOk ? `${finders.length} sensor(s) detect this class` : 'No detecting sensor — add a matching radar',
    },
    fix: {
      ok: fixCapable,
      note: fixCapable ? 'Fire-control-quality track available' : 'Only surveillance track — needs an engagement/MFR radar',
    },
    finish: {
      ok: finishOk,
      effectors: finishList,
      note: finishOk ? `${shooters.length} effector(s) can engage` : 'No effector can finish — add an appropriate shooter',
    },
    summary,
    broken_link: broken,
  };
}

/* ----------------------------- coverage / gap geometry ----------------------------- */

export interface RoutePoint extends GeoPoint {
  alt_km: number;
}

export interface GapSegment {
  index: number;
  point: RoutePoint;
  covered: boolean;
  engagingEffectorIds: string[];
}

/**
 * Walk an ingress route and report, at each point, which effector rings can
 * engage it. Segments with `covered:false` are the seams a drone flies through
 * — the heart of "plan around the polygon" (and, for Blue, the holes to plug).
 */
export function analyzeRoute(rings: EnvelopeRing[], route: RoutePoint[]): GapSegment[] {
  return route.map((pt, i) => {
    const engaging = ringsEngaging(rings, pt, pt.alt_km);
    return {
      index: i,
      point: pt,
      covered: engaging.length > 0,
      engagingEffectorIds: engaging.map((r) => r.effectorId),
    };
  });
}

/** Summarise a route analysis into a planner-friendly verdict. */
export function summarizeRoute(segments: GapSegment[]): {
  coveredPct: number;
  longestGap: number;
  verdict: string;
} {
  const covered = segments.filter((s) => s.covered).length;
  const coveredPct = segments.length ? Math.round((covered / segments.length) * 100) : 0;
  let longest = 0;
  let run = 0;
  for (const s of segments) {
    if (!s.covered) {
      run++;
      longest = Math.max(longest, run);
    } else run = 0;
  }
  const verdict =
    coveredPct === 100
      ? 'Route is fully covered — no engagement gap for an attacker; defence is sound.'
      : coveredPct >= 70
      ? `Mostly covered (${coveredPct}%) with a ${longest}-segment seam — a low/fast ingress could exploit the gap.`
      : `Sparse coverage (${coveredPct}%) — significant gaps an attacker can route through; defence has holes.`;
  return { coveredPct, longestGap: longest, verdict };
}
