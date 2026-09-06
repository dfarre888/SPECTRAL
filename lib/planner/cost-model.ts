/**
 * Engagement cost model — OSINT.
 *
 * The economics page showed three exchange ratios because three was all the data
 * there was: one of 119 seed platforms carried a unit cost and none of the 38
 * effectors did. That is a data gap, not a layout problem, and widening the UI
 * over absent numbers would have meant inventing them.
 *
 * Costs are intervals, for the same reason engagement envelopes are. Published
 * Shahed-136 figures run from roughly $4k for Iranian domestic production,
 * through the $20-50k band CSIS settled on in 2025, to a $375k sticker price
 * reported in 2024 — and the 2022 figures were higher again as production
 * scaled. A single number would be a fiction dressed as precision.
 *
 * The consequence is that an exchange ratio is also an interval, and its width
 * is the useful part: PAC-3 MSE against Shahed-136 is not "67:1", it is somewhere
 * between about 80:1 and 350:1 depending on whose figures you accept. Both ends
 * make the same doctrinal point, which is why the range is publishable even
 * though the point estimate is not.
 *
 * Reusable effects are modelled at their marginal cost per engagement, not their
 * acquisition cost. An RF jammer or a laser has a large capital cost and a
 * near-zero cost per shot, and that asymmetry is the entire argument for using
 * them against cheap mass.
 *
 * CLASSIFICATION: UNCLASSIFIED. Budget documents, manufacturer statements and
 * press reporting only.
 */

export type CostConfidenceBand = 'consensus' | 'contested' | 'order_of_magnitude'

export interface CostInterval {
  loUsd: number
  hiUsd: number
}

export interface CostEntry {
  id: string
  label: string
  side: 'threat' | 'effector'
  /**
   * Cost per engagement. For expendables this is unit cost; for reusable
   * effects it is marginal cost per shot, which is the comparable quantity.
   */
  perEngagementUsd: CostInterval
  /** True where the effect is reusable and the per-shot figure is marginal. */
  reusable: boolean
  confidence: CostConfidenceBand
  note: string
  sources: string[]
}

const SRC_CSIS = 'CSIS, Calculating the Cost-Effectiveness of Russia’s Drone Strikes (2025)'
const SRC_BUDGET = 'US Army budget request documents, FY2025–FY2027'
const SRC_PRESS = 'Defence press reporting (TWZ, Forbes, Defense Express)'
const SRC_MFR = 'Manufacturer statements'

export const COST_ENTRIES: CostEntry[] = [
  // ── Threats ───────────────────────────────────────────────────────────────
  {
    id: 'shahed-136',
    label: 'Shahed-136 / Geran-2',
    side: 'threat',
    perEngagementUsd: { loUsd: 20_000, hiUsd: 50_000 },
    reusable: false,
    confidence: 'contested',
    note:
      'CSIS settled on $20–50k in 2025 after an earlier $35k point estimate. Lower figures near $4k are quoted for Iranian domestic production and a $375k sticker price was reported in 2024; the band here follows the 2025 assessment for a delivered unit.',
    sources: [SRC_CSIS, SRC_PRESS],
  },
  {
    id: 'lancet-3',
    label: 'Lancet-3 loitering munition',
    side: 'threat',
    perEngagementUsd: { loUsd: 25_000, hiUsd: 45_000 },
    reusable: false,
    confidence: 'contested',
    note: 'Widely reported in the tens of thousands; no manufacturer figure is public.',
    sources: [SRC_PRESS],
  },
  {
    id: 'fpv-attack',
    label: 'FPV attack drone',
    side: 'threat',
    perEngagementUsd: { loUsd: 400, hiUsd: 1_500 },
    reusable: false,
    confidence: 'order_of_magnitude',
    note:
      'Assembled from commercial parts, so cost varies with batch and warhead. The order of magnitude is the point: three figures, not five.',
    sources: [SRC_PRESS],
  },
  {
    id: 'cots-quad',
    label: 'COTS quadcopter (modified)',
    side: 'threat',
    perEngagementUsd: { loUsd: 1_000, hiUsd: 8_000 },
    reusable: false,
    confidence: 'order_of_magnitude',
    note: 'Retail airframe plus payload. Wide band covers consumer through prosumer classes.',
    sources: [SRC_PRESS],
  },
  {
    id: 'kalibr-3m14',
    label: 'Kalibr 3M14 cruise missile',
    side: 'threat',
    perEngagementUsd: { loUsd: 1_000_000, hiUsd: 6_500_000 },
    reusable: false,
    confidence: 'contested',
    note: 'Estimates vary by more than a factor of six across published analyses.',
    sources: [SRC_PRESS],
  },
  {
    id: 'jassm-er',
    label: 'JASSM-ER',
    side: 'threat',
    perEngagementUsd: { loUsd: 1_300_000, hiUsd: 1_600_000 },
    reusable: false,
    confidence: 'consensus',
    note: 'US procurement figures are published, so this band is tighter than most.',
    sources: [SRC_BUDGET],
  },

  // ── Effectors ─────────────────────────────────────────────────────────────
  {
    id: 'pac3-mse',
    label: 'PAC-3 MSE interceptor',
    side: 'effector',
    perEngagementUsd: { loUsd: 4_200_000, hiUsd: 5_300_000 },
    reusable: false,
    confidence: 'consensus',
    note:
      'FY2025 request put a round near $4.2M; the FY2027 proposal is closer to $5.3M. Budget documents make this one of the better-attested figures here.',
    sources: [SRC_BUDGET],
  },
  {
    id: 'sm-6',
    label: 'SM-6',
    side: 'effector',
    perEngagementUsd: { loUsd: 4_000_000, hiUsd: 4_900_000 },
    reusable: false,
    confidence: 'consensus',
    note: 'Navy procurement figures.',
    sources: [SRC_BUDGET],
  },
  {
    id: 'sm-2',
    label: 'SM-2',
    side: 'effector',
    perEngagementUsd: { loUsd: 1_800_000, hiUsd: 2_500_000 },
    reusable: false,
    confidence: 'consensus',
    note: 'Older round, correspondingly cheaper than SM-6.',
    sources: [SRC_BUDGET],
  },
  {
    id: 'amraam-nasams',
    label: 'AIM-120 AMRAAM (NASAMS)',
    side: 'effector',
    perEngagementUsd: { loUsd: 1_000_000, hiUsd: 1_500_000 },
    reusable: false,
    confidence: 'consensus',
    note: 'Ground-launched AMRAAM as fired by NASAMS.',
    sources: [SRC_BUDGET],
  },
  {
    id: 'coyote-b2',
    label: 'Coyote Block 2',
    side: 'effector',
    perEngagementUsd: { loUsd: 100_000, hiUsd: 145_000 },
    reusable: false,
    confidence: 'contested',
    note: 'Purpose-built C-UAS interceptor; an order of magnitude below a SAM round.',
    sources: [SRC_BUDGET, SRC_PRESS],
  },
  {
    id: 'apkws',
    label: 'APKWS guided rocket',
    side: 'effector',
    perEngagementUsd: { loUsd: 22_000, hiUsd: 35_000 },
    reusable: false,
    confidence: 'consensus',
    note: 'Laser-guided 70mm rocket, increasingly used in the counter-UAS role for this reason.',
    sources: [SRC_BUDGET],
  },
  {
    id: 'gun-35mm',
    label: '35mm AHEAD gun round (Gepard class)',
    side: 'effector',
    perEngagementUsd: { loUsd: 300, hiUsd: 1_200 },
    reusable: false,
    confidence: 'order_of_magnitude',
    note: 'Per round. A burst is several rounds, so multiply by the doctrinal burst length.',
    sources: [SRC_PRESS],
  },
  {
    id: 'rf-jammer',
    label: 'RF jammer (per engagement)',
    side: 'effector',
    perEngagementUsd: { loUsd: 1, hiUsd: 20 },
    reusable: true,
    confidence: 'order_of_magnitude',
    note:
      'Marginal cost only — power and wear. The capital cost is real but is not what an exchange ratio compares. This is why RF is the first layer against cheap mass.',
    sources: [SRC_MFR],
  },
  {
    id: 'hpm',
    label: 'High-power microwave (per shot)',
    side: 'effector',
    perEngagementUsd: { loUsd: 1, hiUsd: 50 },
    reusable: true,
    confidence: 'order_of_magnitude',
    note: 'Marginal cost per pulse. Effective against groups rather than single targets.',
    sources: [SRC_MFR],
  },
  {
    id: 'hel-laser',
    label: 'High-energy laser (per shot)',
    side: 'effector',
    perEngagementUsd: { loUsd: 1, hiUsd: 30 },
    reusable: true,
    confidence: 'order_of_magnitude',
    note:
      'Manufacturers quote figures around a dollar a shot. Weather-limited, so availability rather than cost is the constraint.',
    sources: [SRC_MFR],
  },
]

export function costById(id: string): CostEntry | undefined {
  return COST_ENTRIES.find((c) => c.id === id)
}

export interface ExchangeRatioBand {
  threat: CostEntry
  effector: CostEntry
  /** Cheapest plausible ratio: cheap interceptor against expensive threat. */
  loRatio: number
  /** Dearest plausible ratio: expensive interceptor against cheap threat. */
  hiRatio: number
  /** Geometric midpoint — appropriate for a ratio spanning orders of magnitude. */
  midRatio: number
  /** Weaker of the two provenances. */
  confidence: CostConfidenceBand
  verdict: ExchangeVerdict
}

export type ExchangeVerdict = 'favourable' | 'acceptable' | 'unfavourable' | 'catastrophic'

const CONF_RANK: Record<CostConfidenceBand, number> = {
  consensus: 0,
  contested: 1,
  order_of_magnitude: 2,
}

/**
 * Verdict bands.
 *
 * Judged on the optimistic end: if even the most favourable reading of the
 * figures is bad, the exchange is bad regardless of which source you believe.
 */
export function verdictFor(loRatio: number): ExchangeVerdict {
  if (loRatio < 1) return 'favourable'
  if (loRatio < 5) return 'acceptable'
  if (loRatio < 50) return 'unfavourable'
  return 'catastrophic'
}

export function exchangeRatio(threat: CostEntry, effector: CostEntry): ExchangeRatioBand {
  // Ratio is effector cost over threat cost: how many threats one shot buys.
  const loRatio = effector.perEngagementUsd.loUsd / threat.perEngagementUsd.hiUsd
  const hiRatio = effector.perEngagementUsd.hiUsd / threat.perEngagementUsd.loUsd
  const midRatio = Math.sqrt(loRatio * hiRatio)
  const confidence =
    CONF_RANK[threat.confidence] >= CONF_RANK[effector.confidence]
      ? threat.confidence
      : effector.confidence
  return { threat, effector, loRatio, hiRatio, midRatio, confidence, verdict: verdictFor(loRatio) }
}

/** Every threat-versus-effector pairing, worst exchange first. */
export function allExchanges(): ExchangeRatioBand[] {
  const threats = COST_ENTRIES.filter((c) => c.side === 'threat')
  const effectors = COST_ENTRIES.filter((c) => c.side === 'effector')
  const out: ExchangeRatioBand[] = []
  for (const t of threats) for (const e of effectors) out.push(exchangeRatio(t, e))
  return out.sort((a, b) => b.loRatio - a.loRatio)
}

/**
 * Cheapest effectors that still make sense against a given threat.
 *
 * Answers the doctrinal question directly: what should be shot at this, and
 * what should be held back.
 */
export function recommendedAgainst(threatId: string, limit = 3): ExchangeRatioBand[] {
  const t = costById(threatId)
  if (!t) return []
  return COST_ENTRIES.filter((c) => c.side === 'effector')
    .map((e) => exchangeRatio(t, e))
    .sort((a, b) => a.loRatio - b.loRatio)
    .slice(0, limit)
}

export function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v >= 100_000 ? 0 : 0)}k`
  return `$${Math.round(v)}`
}

export function formatRatio(r: number): string {
  if (r < 0.01) return '<0.01:1'
  if (r < 1) return `${r.toFixed(2)}:1`
  if (r < 10) return `${r.toFixed(1)}:1`
  return `${Math.round(r)}:1`
}
