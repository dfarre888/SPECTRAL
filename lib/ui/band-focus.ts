/**
 * Band focus: Spectral's signature interaction.
 *
 * Every module in this product keys off frequency: comms bearers, GNSS
 * constellations, radar sets, jammers, defeat mechanisms. Nothing else in the
 * interface connects them, so the connection has to be made by the reader.
 *
 * Pointing at a band anywhere lifts every element on that band across the page
 * and recedes the rest. It answers, in one gesture, the question the data is
 * really about: what else lives here, and what would a single jammer across
 * this stretch take out at once.
 *
 * It is deliberately not decorative. On a hardware page a signature move can be
 * a flourish; here it has to do work, because an analyst who cannot get an
 * answer out of it will stop using it by the second session.
 *
 * Pure functions: the React binding is a thin provider over these.
 */

/** Canonical band names, low frequency to high. */
export const BANDS = ['HF', 'VHF', 'UHF', 'L', 'S', 'C', 'X', 'Ku', 'Ka', 'IR', 'EO', 'VIS', 'UV'] as const
export type Band = (typeof BANDS)[number]

/**
 * Normalise the several shapes a band arrives in.
 *
 * Bearers carry 'voice_uhf', catalogue rows carry 'UHF', spectrum tiles carry
 * 'uhf'. Without this the same band would fail to match itself and the whole
 * interaction would look broken in exactly the places it matters most.
 */
export function normaliseBand(raw: string | null | undefined): Band | null {
  if (!raw) return null
  const cleaned = raw.trim().replace(/^(voice|data)_/i, '')
  const upper = cleaned.toUpperCase()
  const hit = BANDS.find((b) => b.toUpperCase() === upper)
  return hit ?? null
}

export type BandFocusState = 'focused' | 'dimmed' | 'neutral'

/**
 * How an element should render given the currently focused band.
 *
 * 'neutral' when nothing is focused: the resting state must be the ordinary
 * one, so the page is never left in a half-highlighted condition after the
 * pointer leaves.
 */
export function focusState(
  elementBand: string | null | undefined,
  focused: string | null,
): BandFocusState {
  const f = normaliseBand(focused)
  if (!f) return 'neutral'
  const e = normaliseBand(elementBand)
  if (!e) return 'dimmed'
  return e === f ? 'focused' : 'dimmed'
}

/** Bands an element occupies, de-duplicated and ordered. */
export function bandsOf(raw: readonly (string | null | undefined)[]): Band[] {
  const seen = new Set<Band>()
  for (const r of raw) {
    const b = normaliseBand(r)
    if (b) seen.add(b)
  }
  return BANDS.filter((b) => seen.has(b))
}

/**
 * True when an element holding several bands should light up.
 *
 * A platform on both HF and UHF must respond to either, otherwise multi-band
 * platforms, the interesting ones, would appear to drop out of the picture.
 */
export function anyBandMatches(
  elementBands: readonly (string | null | undefined)[],
  focused: string | null,
): boolean {
  const f = normaliseBand(focused)
  if (!f) return false
  return bandsOf(elementBands).includes(f)
}

export function multiFocusState(
  elementBands: readonly (string | null | undefined)[],
  focused: string | null,
): BandFocusState {
  if (!normaliseBand(focused)) return 'neutral'
  return anyBandMatches(elementBands, focused) ? 'focused' : 'dimmed'
}
