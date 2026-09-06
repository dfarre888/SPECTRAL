/**
 * Explains why a SAM engagement falls outside its envelope.
 *
 * The intercept calculator was correct but mute: it reported "out of engagement
 * envelope" without stating the envelope, so a user moving sliders had no way to
 * know where the valid region was or which axis had failed. An SA-7 at 8 km is
 * genuinely out of envelope — its reach is 4.2 km — but nothing on screen said so.
 *
 * A calculator that says no must say why, and where yes begins.
 */

export interface EngagementEnvelope {
  minRangeM: number
  maxRangeM: number
  minAltM: number
  maxAltM: number
}

export type EnvelopeAxis = 'range_short' | 'range_long' | 'alt_low' | 'alt_high'

export interface EnvelopeFailure {
  axis: EnvelopeAxis
  /** Plain statement of what failed, with the numbers that decided it. */
  message: string
  /** Nearest value on this axis that would be inside the envelope. */
  suggestM: number
}

export interface EnvelopeCheck {
  inEnvelope: boolean
  failures: EnvelopeFailure[]
  envelope: EngagementEnvelope
  /** One-line summary of the engagement being computed. */
  statement: string
}

function km(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

export function checkEnvelope(
  envelope: EngagementEnvelope,
  slantRangeM: number,
  targetAltM: number,
  opts: { systemLabel?: string; targetLabel?: string } = {},
): EnvelopeCheck {
  const failures: EnvelopeFailure[] = []

  if (slantRangeM < envelope.minRangeM) {
    failures.push({
      axis: 'range_short',
      message: `${km(slantRangeM)} is inside the ${km(envelope.minRangeM)} minimum range — the round cannot arm and guide in time.`,
      suggestM: envelope.minRangeM,
    })
  } else if (slantRangeM > envelope.maxRangeM) {
    failures.push({
      axis: 'range_long',
      message: `${km(slantRangeM)} exceeds the ${km(envelope.maxRangeM)} maximum range.`,
      suggestM: envelope.maxRangeM,
    })
  }

  if (targetAltM < envelope.minAltM) {
    failures.push({
      axis: 'alt_low',
      message: `${km(targetAltM)} is below the ${km(envelope.minAltM)} minimum engagement altitude — ground clutter and seeker geometry.`,
      suggestM: envelope.minAltM,
    })
  } else if (targetAltM > envelope.maxAltM) {
    failures.push({
      axis: 'alt_high',
      message: `${km(targetAltM)} exceeds the ${km(envelope.maxAltM)} altitude ceiling.`,
      suggestM: envelope.maxAltM,
    })
  }

  const sys = opts.systemLabel ?? 'System'
  const tgt = opts.targetLabel ?? 'target'
  // No article: targets are acronyms (OWA, FPV, MALE) where "a"/"an" reads wrong.
  const statement =
    `${sys} engaging ${tgt} at ${km(slantRangeM)} slant range, ${km(targetAltM)} altitude.`

  return { inEnvelope: failures.length === 0, failures, envelope, statement }
}

/**
 * Where the valid band sits on a slider, as percentages of its full travel.
 *
 * Lets the control shade its own in-envelope region, so the user can see where
 * a valid engagement lives instead of hunting for it.
 */
export function envelopeBandPct(
  minM: number,
  maxM: number,
  sliderMaxM: number,
): { leftPct: number; widthPct: number } {
  if (sliderMaxM <= 0) return { leftPct: 0, widthPct: 0 }
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const left = clamp((minM / sliderMaxM) * 100)
  const right = clamp((Math.min(maxM, sliderMaxM) / sliderMaxM) * 100)
  return { leftPct: left, widthPct: Math.max(0, right - left) }
}

/**
 * Slider maximum for an axis — the envelope with headroom, so the user can see
 * the edge and step past it deliberately rather than the control being pinned
 * to a scale on which every system looks identical.
 */
export function sliderMaxFor(envelopeMaxM: number, headroom = 1.35): number {
  const raw = envelopeMaxM * headroom
  // Round to a tidy step so the readout does not look arbitrary.
  const step = raw > 50_000 ? 10_000 : raw > 10_000 ? 2_000 : 500
  return Math.ceil(raw / step) * step
}
