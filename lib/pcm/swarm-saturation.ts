/**
 * Swarm / saturation inbound queue for magazine-limited defence.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import { computeThreatTti } from '@/lib/pcm/threat-kinematics';
import { gridRef } from '@/lib/pcm/pcm-spectrum-bridge';

type Platform = PCM.Platform;
type WorldState = PCM.WorldState;
type Order = PCM.Order;

export interface InboundQueueItem {
  threat: Platform;
  tti: number;
  isDecoy: boolean;
  isConfirmedReal: boolean;
  contactConfidence: PCM.ContactConfidence | null;
  priority: number;
}

const THREAT_GROUPS = new Set(['OWA', 'FPV', 'loitering_munition', 'decoy']);

export function isInboundThreat(p: Platform): boolean {
  if (p.status === 'destroyed' || p.status === 'mission_complete') return false;
  return (
    THREAT_GROUPS.has(p.group) &&
    ['airborne_tasked', 'airborne_loiter', 'pre_launch'].includes(p.status)
  );
}

export function buildInboundQueue(
  state: WorldState,
  _redOrders: Order | null,
): InboundQueueItem[] {
  const blueC2 = state.blue_force.c2?.gcs_location ?? 'ALPHA-4';
  const items: InboundQueueItem[] = [];

  for (const threat of state.red_force.platforms.filter(isInboundThreat)) {
    if (threat.status === 'pre_launch') continue;

    const tti = computeThreatTti(threat, blueC2) ?? 99;
    const contact = state.all_contacts.find(
      (c) => c.true_platform_id === threat.id && c.detected_by === 'BLUE',
    );

    const isDecoy = threat.group === 'decoy';
    const isConfirmedReal =
      !!contact &&
      !contact.misclassified &&
      contact.confidence !== 'low' &&
      contact.confidence !== 'possible';

    let priority = tti;
    if (isConfirmedReal && !isDecoy) priority -= 50;
    if (isDecoy) priority += 30;

    items.push({
      threat,
      tti,
      isDecoy,
      isConfirmedReal,
      contactConfidence: contact?.confidence ?? null,
      priority,
    });
  }

  return items.sort((a, b) => a.priority - b.priority || a.tti - b.tti);
}

export function applyWaveActivation(state: WorldState, batchSize: number): number {
  const preLaunch = state.red_force.platforms.filter(
    (p) => p.status === 'pre_launch' && THREAT_GROUPS.has(p.group),
  );
  let activated = 0;
  for (const p of preLaunch.slice(0, batchSize)) {
    p.status = 'airborne_tasked';
    p.altitude_m = p.altitude_m ?? (p.group === 'OWA' ? 200 : 500);
    activated += 1;
  }
  return activated;
}

export function countLeakers(queue: InboundQueueItem[], interceptedIds: Set<string>): number {
  return queue.filter((q) => !interceptedIds.has(q.threat.id) && q.threat.status !== 'destroyed')
    .length;
}

export function gridRefPlatform(p: Platform): string {
  return gridRef(p);
}

/** L-band jam strings used by legacy EW assets ('L') and OSINT jammer DB ('L1'/'L2'/'GPS'). */
export function isLBandJamBand(b: string): boolean {
  return b === 'L' || b === 'L1' || b === 'GPS' || b === 'L2';
}

export function hasActiveLBandJamming(assets: PCM.EWAsset[]): boolean {
  return assets.some((a) => a.status === 'active' && a.jam_bands.some(isLBandJamBand));
}

/**
 * Apply GNSS jamming to swarm coherence.
 * When L-band jamming is active and a swarm of ≥3 GNSS-dependent platforms is inbound,
 * the formation degrades: platforms scatter to randomised heading offsets, increasing
 * miss probability for coordinated time-on-target attacks but NOT destroying them.
 *
 * OSINT basis: Ukrainian EW testimony 2023, CNAS drone swarm vulnerability analysis
 */
export function applyGnssSwarmDegradation(
  state: WorldState,
  activeEwAssets: PCM.EWAsset[],
  rng: () => number,
): { degradedCount: number; events: PCM.AdjudicationEvent[] } {
  const events: PCM.AdjudicationEvent[] = [];

  const lBandActive = hasActiveLBandJamming(activeEwAssets);
  if (!lBandActive) return { degradedCount: 0, events };

  const gnssPlatforms = state.red_force.platforms.filter(
    (p) =>
      (p.status === 'airborne_tasked' || p.status === 'airborne_loiter') &&
      !p.ew_immune &&
      (p.guidance === 'GNSS_INS' || p.guidance === 'GNSS_INS_ATR'),
  );

  if (gnssPlatforms.length < 3) {
    return { degradedCount: 0, events };
  }

  let scatterCount = 0;
  for (const p of gnssPlatforms) {
    const jammingRoll = rng();
    if (jammingRoll < 0.45) {
      p.speed_kt = Math.round((p.speed_kt ?? 80) * (0.6 + rng() * 0.3));
      p.damage_state = p.damage_state ?? 'degraded';
      scatterCount += 1;
    }
  }

  const coherenceLost = scatterCount > gnssPlatforms.length / 2;

  if (scatterCount > 0) {
    events.push({
      event_id: `EVT-SWARM-GNSS-${state.turn}`,
      type: 'ew_effect',
      description:
        `GNSS L-band jamming scattered ${scatterCount}/${gnssPlatforms.length} swarm platforms. ` +
        (coherenceLost
          ? 'Coordinated time-on-target BROKEN — swarm attacking in dispersed pattern.'
          : 'Partial scatter — swarm cohesion degraded but attack continues.'),
      affected_platform_ids: gnssPlatforms.map((p) => p.id),
      visible_to_red: true,
      visible_to_blue: true,
      visible_to_ds: true,
    });
  }

  return { degradedCount: scatterCount, events };
}

