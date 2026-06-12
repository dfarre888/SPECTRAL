/**
 * Spectrum Intelligence — engagement engine
 * -----------------------------------------
 * Computes band overlaps between a Red threat and a Blue effector, then
 * derives a plain-language outcome verdict and recommendations.
 *
 * This is the logic behind the headline teaching moment:
 *   - DroneGun vs Skydio  → heavy overlap → "defeat likely"
 *   - DroneGun vs FOC FPV → zero overlap  → "no engagement, use HPM/kinetic"
 */

import type {
  Platform,
  SpectrumCapability,
  BandOverlap,
  EngagementResult,
  CapabilityFunction,
} from './types';
import { capabilityExtent } from './scale';

const JAM_FUNCTIONS: CapabilityFunction[] = [
  'jam_control',
  'jam_video',
  'jam_gnss',
  'jam_datalink',
  'spoof_gnss',
  'takeover',
];
const HARD_FUNCTIONS: CapabilityFunction[] = ['hpm', 'laser_defeat'];
const DETECT_FUNCTIONS: CapabilityFunction[] = [
  'detect_rf',
  'detect_radar',
  'detect_eo_ir',
  'detect_cbrn',
];

/** Red capabilities that a jammer/spoofer can act on (RF-dependent). */
const RED_TARGETABLE: CapabilityFunction[] = [
  'control',
  'video',
  'telemetry',
  'datalink',
  'navigation',
];

function overlap1D(
  aLo: number,
  aHi: number,
  bLo: number,
  bHi: number
): [number, number] | null {
  const lo = Math.max(aLo, bLo);
  const hi = Math.min(aHi, bHi);
  return lo <= hi ? [lo, hi] : null;
}

/**
 * Compute every band intersection between Red dependencies and Blue coverage.
 * Only RF/GNSS jamming-type interactions produce overlaps; HPM and kinetic are
 * handled separately because they don't act through a specific band.
 */
/** Operations edition: band overlap alone is insufficient if propagation blocks the link. */
export function propagationEngagementViable(
  bandOverlaps: BandOverlap[],
  propagation: { los_state: string; jam_to_signal_db: number | null } | null | undefined,
): boolean {
  if (bandOverlaps.length === 0) return false;
  if (!propagation) return true;
  if (propagation.los_state === 'NLOS') return false;
  if (propagation.jam_to_signal_db != null && propagation.jam_to_signal_db < 3) return false;
  return true;
}

export function computeOverlaps(
  red: Platform,
  blue: Platform
): BandOverlap[] {
  const redCaps = (red.capabilities ?? []).filter((c) =>
    RED_TARGETABLE.includes(c.fn)
  );
  const blueCaps = (blue.capabilities ?? []).filter((c) =>
    JAM_FUNCTIONS.includes(c.fn)
  );

  const out: BandOverlap[] = [];
  for (const r of redCaps) {
    for (const b of blueCaps) {
      // both must resolve on the same unit; prefer Hz for RF/GNSS
      const unit = r.axis === 'eo_ir' || b.axis === 'eo_ir' ? 'um' : 'hz';
      const re = capabilityExtent(r, unit);
      const be = capabilityExtent(b, unit);
      if (!re || !be) continue;
      const ov = overlap1D(re[0], re[1], be[0], be[1]);
      if (ov) {
        out.push({
          axis: r.axis,
          layer: r.layer,
          redCapability: r,
          blueCapability: b,
          lo: ov[0],
          hi: ov[1],
          unit,
        });
      }
    }
  }
  return out;
}

/** Does the Red platform have any RF emission at all? */
function isRfSilent(red: Platform): boolean {
  const caps = red.capabilities ?? [];
  const anyRfEmit = caps.some(
    (c) =>
      (c.axis === 'rf' || c.axis === 'gnss') &&
      ['control', 'video', 'telemetry', 'datalink'].includes(c.fn)
  );
  const taggedSilent = caps.some((c) =>
    (c.defeat_resistance ?? []).includes('rf_silent')
  );
  return taggedSilent || !anyRfEmit;
}

/** Can the threat still operate with GNSS denied? */
function isGnssDeniedCapable(red: Platform): boolean {
  return (red.capabilities ?? []).some((c) =>
    (c.defeat_resistance ?? []).includes('gnss_denied_capable')
  );
}

/**
 * Produce the full engagement assessment.
 */
export function assessEngagement(
  red: Platform,
  blue: Platform
): EngagementResult {
  const overlaps = computeOverlaps(red, blue);
  const blueCaps = blue.capabilities ?? [];
  const hasHPM = blueCaps.some((c) => HARD_FUNCTIONS.includes(c.fn));
  const isDetectorOnly =
    blueCaps.length > 0 &&
    blueCaps.every((c) => DETECT_FUNCTIONS.includes(c.fn));

  // capabilities the threat retains that Blue's jamming did not cover
  const coveredIds = new Set(overlaps.map((o) => o.redCapability.id));
  const uncovered = (red.capabilities ?? []).filter(
    (c) => RED_TARGETABLE.includes(c.fn) && !coveredIds.has(c.id)
  );

  const rfSilent = isRfSilent(red);
  const gnssDenied = isGnssDeniedCapable(red);

  // ---- DETECT-ONLY effector ----
  if (isDetectorOnly) {
    return {
      verdict: 'detect_only',
      headline: `${blue.name} provides detection, not defeat.`,
      detail: rfSilent
        ? `${red.name} emits no RF, so passive RF detection will miss it. Cue radar / acoustic / EO-IR sensors instead.`
        : `${blue.name} can find and track ${red.name} via its emissions, but a separate effector is required to defeat it.`,
      overlaps,
      uncovered,
      recommendations: rfSilent
        ? ['Use radar + acoustic + EO/IR fusion (SAPIENT-style) to detect.', 'Pair with an HPM or kinetic effector to defeat.']
        : ['Hand the track to a jammer, HPM, or kinetic effector.'],
    };
  }

  // ---- RF-SILENT threat vs jamming effector ----
  if (rfSilent && !hasHPM) {
    return {
      verdict: 'no_engagement',
      headline: 'Jammer bands overlap nothing. The threat is immune.',
      detail: `${red.name} carries no RF control link and does not depend on GNSS, so RF/GNSS jamming is not applicable. The control path (e.g. fibre-optic) and navigation (visual/inertial) cannot be reached through the spectrum.`,
      overlaps: [],
      uncovered,
      recommendations: [
        'Detect via non-RF means: acoustic, optical, or radar.',
        'Defeat with a direct-electronics effect — High-Power Microwave (HPM).',
        'Consider kinetic interception (net, interceptor UAS, gun).',
      ],
    };
  }

  // ---- HPM present ----
  if (hasHPM) {
    const note = rfSilent
      ? `${red.name} is RF-silent, but HPM does not rely on the control link — it induces destructive voltage in the airframe's electronics regardless of how the drone is controlled.`
      : `HPM supplements RF/GNSS coverage with a one-to-many electronics-kill effect, useful against swarms and hardened links.`;
    return {
      verdict: 'defeat_likely',
      headline: 'High-Power Microwave engages the electronics directly.',
      detail: note,
      overlaps,
      uncovered: [], // HPM is band-agnostic; nothing meaningfully "uncovered"
      recommendations: [
        'HPM effective within its engagement envelope (~2 km class).',
        rfSilent ? 'No RF/GNSS effect available — HPM/kinetic is the path.' : 'Layer with RF/GNSS jamming for graduated response.',
      ],
    };
  }

  // ---- Standard RF/GNSS engagement: judge by EFFECTIVE coverage ----
  // Geometric overlap is necessary but not sufficient. A band the jammer
  // "covers" may be hardened (CRPA, frequency-hopping) so the effect doesn't
  // land. We weight each covered capability by how resistant it is.
  const targetable = (red.capabilities ?? []).filter((c) =>
    RED_TARGETABLE.includes(c.fn)
  );
  const targetableCount = targetable.length;
  const coveredCount = coveredIds.size;

  // effectiveness weight per covered capability (1 = fully defeatable)
  const effWeight = (cap: SpectrumCapability): number => {
    const r = cap.defeat_resistance ?? [];
    if (r.some((x) => x.endsWith('_high'))) return 0.2;   // CRPA / hardened
    if (r.some((x) => x.endsWith('_med'))) return 0.55;   // hopping / partial
    return 1;                                             // soft target
  };
  const covered = targetable.filter((c) => coveredIds.has(c.id));
  const effectiveScore = covered.reduce((s, c) => s + effWeight(c), 0);
  const effectiveCoverage = targetableCount
    ? effectiveScore / targetableCount
    : 0;

  // A threat that keeps flying GNSS-denied can't be stopped by link/nav jam alone.
  if (gnssDenied && effectiveCoverage < 0.9) {
    return {
      verdict: 'partial',
      headline: 'Links jammable, but the threat completes the attack autonomously.',
      detail: `${blue.name} overlaps ${coveredCount} of ${targetableCount} of ${red.name}'s RF/GNSS dependencies, but ${red.name} carries AI/visual terminal guidance and can strike with GNSS denied. Jamming may disrupt mid-course navigation without preventing terminal attack.`,
      overlaps,
      uncovered,
      recommendations: [
        'GNSS/link jamming alone will not stop a terminal-guided strike.',
        'Layer a terminal-phase effector — HPM or kinetic interception.',
        'Hardened GNSS (CRPA) further reduces jamming effectiveness.',
      ],
    };
  }

  if (effectiveCoverage >= 0.6) {
    return {
      verdict: 'defeat_likely',
      headline: 'Control, video, and navigation covered → forced land / RTH probable.',
      detail: `${blue.name} effectively covers ${coveredCount} of ${targetableCount} of ${red.name}'s RF/GNSS dependencies. Loss of the control link typically forces hover, return-to-home, or land.`,
      overlaps,
      uncovered,
      recommendations: [
        'Monitor for return-to-home flight that may transit sensitive airspace.',
        'Confirm defeat — jammed drones can recover when out of range.',
      ],
    };
  }

  if (coveredCount > 0 && effectiveCoverage < 0.6) {
    return {
      verdict: 'partial',
      headline: 'Bands overlap, but the threat is hardened against jamming.',
      detail: `${blue.name} geometrically covers ${coveredCount} of ${targetableCount} dependencies, but anti-jam features (e.g. CRPA antennas, frequency hopping) sharply reduce the effect. Defeat is not assured.`,
      overlaps,
      uncovered,
      recommendations: [
        'Expect degraded jamming effectiveness against hardened navigation.',
        'Escalate to HPM or kinetic for a reliable defeat.',
      ],
    };
  }

  return {
    verdict: 'no_engagement',
    headline: 'No band overlap — this effector cannot engage this threat.',
    detail: `None of ${blue.name}'s coverage intersects ${red.name}'s dependencies.`,
    overlaps,
    uncovered,
    recommendations: ['Select an effector matched to the threat bands, or use HPM/kinetic.'],
  };
}

/* ----------------------------- GNSS REFERENCE ----------------------------- */
/** Canonical GNSS band centres (Hz) used by the fallback generator and the NAVWAR canvas. */
export const GNSS_BANDS: Record<string, { label: string; lo: number; hi: number }[]> = {
  GPS: [
    { label: 'GPS L1', lo: 1574.42e6, hi: 1576.42e6 },
    { label: 'GPS L2', lo: 1226.6e6, hi: 1228.6e6 },
    { label: 'GPS L5', lo: 1175.45e6, hi: 1177.45e6 },
  ],
  GLONASS: [
    { label: 'GLONASS G1', lo: 1598e6, hi: 1606e6 },
    { label: 'GLONASS G2', lo: 1242e6, hi: 1250e6 },
  ],
  Galileo: [
    { label: 'Galileo E1', lo: 1574.42e6, hi: 1576.42e6 },
    { label: 'Galileo E5a', lo: 1175.45e6, hi: 1177.45e6 },
    { label: 'Galileo E5b', lo: 1206.14e6, hi: 1208.14e6 },
    { label: 'Galileo E6', lo: 1277.75e6, hi: 1279.75e6 },
  ],
  BeiDou: [
    { label: 'BeiDou B1', lo: 1560.098e6, hi: 1562.098e6 },
    { label: 'BeiDou B2', lo: 1206.14e6, hi: 1208.14e6 },
    { label: 'BeiDou B3', lo: 1267.52e6, hi: 1269.52e6 },
  ],
  QZSS: [
    { label: 'QZSS L1', lo: 1574.42e6, hi: 1576.42e6 },
    { label: 'QZSS L6', lo: 1277.75e6, hi: 1279.75e6 },
  ],
  NavIC: [
    { label: 'NavIC L5', lo: 1175.45e6, hi: 1177.45e6 },
    { label: 'NavIC S', lo: 2491.028e6, hi: 2493.028e6 },
  ],
};
