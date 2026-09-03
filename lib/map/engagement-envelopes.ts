/**
 * Engagement envelopes for air defence systems — OSINT.
 *
 * Two things drove the shape of this data, both learned from the sources
 * themselves rather than assumed:
 *
 * 1. Open sources disagree, often by a factor of several. Published figures for
 *    PAC-3 MSE range run from 35 km to 60 km to 160 km, and Lockheed's own sheet
 *    notes official ranges are not released. Recording a single number would
 *    manufacture a precision nobody has, so every range is an interval with the
 *    spread preserved.
 *
 * 2. Kinematic reach is not engagement reach. The 40N6 is widely quoted at
 *    400 km, and open analysis questions whether the fire-control radar can
 *    support engagement at that distance. A 400 km ring drawn on a map is a
 *    claim about the missile, not about what the system can actually kill. The
 *    two are stored separately and the planner uses the effective figure.
 *
 * No Pk is recorded here. Kill probability against a given target is not
 * available in open sources at any useful confidence, and inventing it would be
 * worse than leaving it blank — it would be undetectable. Pk comes from the
 * accredited layer; where none exists the kill chain marks the stage estimated
 * and widens its band.
 *
 * CLASSIFICATION: UNCLASSIFIED. Published/manufacturer/press figures only.
 */

export type EnvelopeConfidence = 'consensus' | 'contested' | 'single_source'

export interface RangeInterval {
  /** Lower published figure, metres. */
  loM: number
  /** Upper published figure, metres. */
  hiM: number
}

export interface EngagementEnvelope {
  id: string
  label: string
  nation: string
  category: 'sam_long' | 'sam_medium' | 'sam_short' | 'chaad' | 'abm'
  /** What the interceptor can reach — the figure usually quoted in headlines. */
  kinematicRangeM: RangeInterval
  /**
   * Where the system can realistically engage, bounded by fire control and
   * geometry. Null where open sources give no basis to distinguish it.
   */
  effectiveRangeM: RangeInterval | null
  /** Acquisition radar detection range against a conventional aircraft target. */
  detectionRangeM: RangeInterval | null
  /** Maximum intercept altitude, metres. */
  ceilingM: RangeInterval | null
  /** Pulse-Doppler fire control implies a clutter notch. */
  dopplerNotch: boolean
  /**
   * Notch half-width in degrees of aspect. Genuinely not published for any of
   * these systems — a modelling assumption, flagged as such, uniform so it does
   * not silently advantage one side.
   */
  notchHalfWidthDeg: number
  confidence: EnvelopeConfidence
  /** Why the numbers look the way they do, including where sources conflict. */
  note: string
  sources: string[]
}

const SRC_CSIS = 'CSIS Missile Threat (missilethreat.csis.org)'
const SRC_MDAA = 'Missile Defense Advocacy Alliance'
const SRC_LM = 'Lockheed Martin PAC-3 MSE product sheet'
const SRC_WIKI = 'Wikipedia, citing manufacturer and press reporting'

/** Uniform assumption — see notchHalfWidthDeg. */
const ASSUMED_NOTCH_DEG = 12

export const ENGAGEMENT_ENVELOPES: EngagementEnvelope[] = [
  {
    id: 'patriot-pac2',
    label: 'Patriot PAC-2 (MIM-104)',
    nation: 'USA',
    category: 'sam_long',
    kinematicRangeM: { loM: 70_000, hiM: 160_000 },
    effectiveRangeM: { loM: 70_000, hiM: 100_000 },
    detectionRangeM: { loM: 100_000, hiM: 170_000 },
    ceilingM: { loM: 20_000, hiM: 24_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'contested',
    note:
      'Anti-aircraft variant. Published range spans a wide band; the upper figure is a kinematic maximum against a non-manoeuvring high-altitude target.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'patriot-pac3',
    label: 'Patriot PAC-3 (CRI)',
    nation: 'USA',
    category: 'abm',
    kinematicRangeM: { loM: 15_000, hiM: 35_000 },
    effectiveRangeM: { loM: 15_000, hiM: 30_000 },
    detectionRangeM: { loM: 100_000, hiM: 170_000 },
    ceilingM: { loM: 15_000, hiM: 20_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'contested',
    note:
      'Hit-to-kill interceptor optimised for ballistic targets; shorter reach than PAC-2 against aircraft.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'patriot-pac3-mse',
    label: 'Patriot PAC-3 MSE',
    nation: 'USA',
    category: 'abm',
    kinematicRangeM: { loM: 35_000, hiM: 60_000 },
    effectiveRangeM: { loM: 35_000, hiM: 60_000 },
    detectionRangeM: { loM: 100_000, hiM: 170_000 },
    ceilingM: { loM: 20_000, hiM: 30_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'contested',
    note:
      'Dual-pulse motor. Published range runs 35 km to 60 km to 160 km depending on source and target type; Lockheed states official ranges are not released. The 160 km figure is not carried here because no source ties it to an aircraft engagement.',
    sources: [SRC_LM, SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'thaad',
    label: 'THAAD',
    nation: 'USA',
    category: 'abm',
    kinematicRangeM: { loM: 150_000, hiM: 200_000 },
    effectiveRangeM: { loM: 150_000, hiM: 200_000 },
    detectionRangeM: { loM: 500_000, hiM: 1_000_000 },
    ceilingM: { loM: 100_000, hiM: 150_000 },
    dopplerNotch: false,
    notchHalfWidthDeg: 0,
    confidence: 'consensus',
    note:
      'Exo/endo-atmospheric ballistic missile defence. Not an anti-aircraft system — present so a laydown can show ABM coverage, and it should not be treated as a threat to aircraft. AN/TPY-2 detection range varies enormously with mode.',
    sources: [SRC_CSIS, SRC_MDAA],
  },
  {
    id: 's300-pmu2',
    label: 'S-300PMU-2 Favorit',
    nation: 'RUS',
    category: 'sam_long',
    kinematicRangeM: { loM: 150_000, hiM: 200_000 },
    effectiveRangeM: { loM: 120_000, hiM: 195_000 },
    detectionRangeM: { loM: 200_000, hiM: 300_000 },
    ceilingM: { loM: 25_000, hiM: 27_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'consensus',
    note: 'Widely exported; figures are relatively consistent across sources.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 's400-48n6',
    label: 'S-400 Triumf (48N6 series)',
    nation: 'RUS',
    category: 'sam_long',
    kinematicRangeM: { loM: 200_000, hiM: 250_000 },
    effectiveRangeM: { loM: 150_000, hiM: 250_000 },
    detectionRangeM: { loM: 400_000, hiM: 600_000 },
    ceilingM: { loM: 27_000, hiM: 30_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'consensus',
    note: 'The standard S-400 loadout and the figure most engagements should assume.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 's400-40n6',
    label: 'S-400 Triumf (40N6 long-range)',
    nation: 'RUS',
    category: 'sam_long',
    kinematicRangeM: { loM: 380_000, hiM: 400_000 },
    // Deliberately far below the kinematic figure — see note.
    effectiveRangeM: { loM: 150_000, hiM: 250_000 },
    detectionRangeM: { loM: 400_000, hiM: 600_000 },
    ceilingM: { loM: 30_000, hiM: 35_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'contested',
    note:
      'The 400 km figure is a missile capability. Open analysis questions whether the fire-control radar can support engagement at that distance against a low-altitude target, since the target must be above the radar horizon. Effective range is therefore held near the 48N6 band; drawing a 400 km ring overstates the threat.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'hq9',
    label: 'HQ-9 / HQ-9B',
    nation: 'CHN',
    category: 'sam_long',
    kinematicRangeM: { loM: 125_000, hiM: 260_000 },
    effectiveRangeM: { loM: 100_000, hiM: 200_000 },
    detectionRangeM: { loM: 120_000, hiM: 300_000 },
    ceilingM: { loM: 27_000, hiM: 30_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'contested',
    note: 'Variant figures differ substantially; HQ-9B is the longer-ranged export/domestic upgrade.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'nasams-amraam-er',
    label: 'NASAMS (AMRAAM-ER)',
    nation: 'NOR',
    category: 'sam_medium',
    kinematicRangeM: { loM: 25_000, hiM: 50_000 },
    effectiveRangeM: { loM: 25_000, hiM: 40_000 },
    detectionRangeM: { loM: 60_000, hiM: 120_000 },
    ceilingM: { loM: 14_000, hiM: 20_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'consensus',
    note: 'Ground-launched AMRAAM. In Australian service under LAND 19 Phase 7B.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'pantsir-s1',
    label: 'Pantsir-S1',
    nation: 'RUS',
    category: 'chaad',
    kinematicRangeM: { loM: 15_000, hiM: 20_000 },
    effectiveRangeM: { loM: 12_000, hiM: 20_000 },
    detectionRangeM: { loM: 30_000, hiM: 36_000 },
    ceilingM: { loM: 8_000, hiM: 15_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'consensus',
    note: 'Gun-missile point defence; the 30 mm guns add a ~4 km inner engagement zone not modelled separately.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'tor-m2',
    label: 'Tor-M2',
    nation: 'RUS',
    category: 'sam_short',
    kinematicRangeM: { loM: 12_000, hiM: 16_000 },
    effectiveRangeM: { loM: 10_000, hiM: 15_000 },
    detectionRangeM: { loM: 25_000, hiM: 32_000 },
    ceilingM: { loM: 6_000, hiM: 10_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'consensus',
    note: 'Short-range point defence, effective against precision munitions and UAS.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
  {
    id: 'iron-dome',
    label: 'Iron Dome (Tamir)',
    nation: 'ISR',
    category: 'sam_short',
    kinematicRangeM: { loM: 4_000, hiM: 70_000 },
    effectiveRangeM: { loM: 4_000, hiM: 40_000 },
    detectionRangeM: { loM: 40_000, hiM: 100_000 },
    ceilingM: { loM: 8_000, hiM: 10_000 },
    dopplerNotch: true,
    notchHalfWidthDeg: ASSUMED_NOTCH_DEG,
    confidence: 'contested',
    note: 'Optimised for rockets and artillery rather than aircraft; the wide band reflects the range of engagement types reported.',
    sources: [SRC_CSIS, SRC_WIKI],
  },
]

export type PlanningPosture = 'optimistic' | 'nominal' | 'conservative'

/**
 * Collapse an interval to a single figure under a stated planning posture.
 *
 * The posture is the planner's assumption, not a property of the system, so it
 * is chosen explicitly and reported alongside any result. Conservative assumes
 * the adversary achieves the upper published figure.
 */
export function rangeUnderPosture(
  interval: RangeInterval | null,
  posture: PlanningPosture,
): number | null {
  if (!interval) return null
  switch (posture) {
    case 'optimistic':
      return interval.loM
    case 'conservative':
      return interval.hiM
    default:
      return (interval.loM + interval.hiM) / 2
  }
}

/** Spread between published figures, as a fraction of the midpoint. */
export function disagreementRatio(interval: RangeInterval | null): number {
  if (!interval) return 0
  const mid = (interval.loM + interval.hiM) / 2
  if (mid <= 0) return 0
  return (interval.hiM - interval.loM) / mid
}

export function envelopeById(id: string): EngagementEnvelope | undefined {
  return ENGAGEMENT_ENVELOPES.find((e) => e.id === id)
}

// ── Bridge to the route planner ─────────────────────────────────────────────

import type { ThreatEmitter, ThreatConfidence } from '@/lib/map/threat-route'

const CONF_MAP: Record<EnvelopeConfidence, ThreatConfidence> = {
  consensus: 'osint',
  contested: 'estimated',
  single_source: 'estimated',
}

export interface PlacedEmitter {
  envelopeId: string
  lon: number
  lat: number
  /** Optional instance label, e.g. 'SAM site 3'. */
  label?: string
  /**
   * Pk from the accredited layer. Omitted deliberately: no Pk is published for
   * these systems, so a caller with no accredited data gets the documented
   * placeholder and a route flagged 'estimated'.
   */
  pk?: number
}

/** Placeholder used only when the accredited layer supplies nothing. */
export const UNKNOWN_PK_PLACEHOLDER = 0.4

/**
 * Turn placed systems into planner threats under a stated posture.
 *
 * Uses effective range for engagement — kinematic reach would draw rings the
 * fire control cannot support.
 */
export function toThreatEmitters(
  placed: readonly PlacedEmitter[],
  posture: PlanningPosture = 'nominal',
): ThreatEmitter[] {
  const out: ThreatEmitter[] = []
  for (const p of placed) {
    const env = envelopeById(p.envelopeId)
    if (!env) continue

    const engagementRangeM =
      rangeUnderPosture(env.effectiveRangeM ?? env.kinematicRangeM, posture) ?? 0
    const detectionRangeM =
      rangeUnderPosture(env.detectionRangeM, posture) ?? engagementRangeM * 1.5

    out.push({
      id: `${env.id}@${p.lon.toFixed(4)},${p.lat.toFixed(4)}`,
      label: p.label ?? env.label,
      lon: p.lon,
      lat: p.lat,
      detectionRangeM: Math.max(detectionRangeM, engagementRangeM),
      engagementRangeM,
      pk: p.pk ?? UNKNOWN_PK_PLACEHOLDER,
      dopplerNotch: env.dopplerNotch,
      notchHalfWidthDeg: env.notchHalfWidthDeg,
      engagementsPerMin: 2,
      // An accredited Pk cannot upgrade an estimated envelope, and a contested
      // envelope cannot be redeemed by a good Pk. Take the worse of the two.
      confidence: p.pk === undefined ? 'estimated' : CONF_MAP[env.confidence],
    })
  }
  return out
}
