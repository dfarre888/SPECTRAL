/**
 * Gloss budget.
 *
 * Dark Frame's central rule is that gloss appears in two or three places per
 * screen and nowhere else: gloss everywhere is a theme, gloss in one place is
 * a thing worth looking at. Put a sweep on every panel and the page reads
 * uniformly plasticky rather than expensive.
 *
 * In an operations tool that rule has to be enforced by code rather than
 * discipline, because the number of tiles in an attention state changes with
 * the data. A quiet morning must not produce a matte page and a bad afternoon
 * a page where everything shines: the budget is fixed, so the shine always
 * means "these are the ones that matter most", never "lots is happening".
 *
 * Hue: purple is the only tone in this system not already carrying meaning.
 * Red and blue are force sides, orange is the accent, cyan is data, green is
 * nominal status. Spending an existing semantic colour on a surface treatment
 * would make the treatment read as data.
 */

/** Maximum glossy elements on one screen. Dark Frame says two or three. */
export const GLOSS_BUDGET = 2

export interface GlossCandidate {
  /** Stable key for the element competing for gloss. */
  key: string
  /** Higher wins. Ties break on the order supplied, so callers control priority. */
  weight: number
  /** Only elements actually wanting attention compete at all. */
  eligible: boolean
}

/**
 * Pick the elements that get gloss.
 *
 * Returns a set rather than a list so the render path is a cheap membership
 * test, and returns nothing at all when nothing is eligible: a screen with no
 * attention state should be entirely matte, which is what makes the treatment
 * legible when it does appear.
 */
export function allocateGloss(
  candidates: readonly GlossCandidate[],
  budget = GLOSS_BUDGET,
): Set<string> {
  const eligible = candidates.filter((c) => c.eligible)
  // Stable: equal weights keep the caller's order rather than sorting arbitrarily.
  const ranked = eligible
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.weight - a.c.weight || a.i - b.i)
    .slice(0, Math.max(0, budget))
  return new Set(ranked.map((r) => r.c.key))
}

/** Class list for a glossy surface, or the matte fallback. */
export function glossClass(on: boolean, matte: string): string {
  return on ? 'gloss-tile purple' : matte
}
