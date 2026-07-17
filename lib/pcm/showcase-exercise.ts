/**
 * Canonical evaluator walkthrough exercise — OSINT Kyiv OWA intercept vignette.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
export const SHOWCASE_EXERCISE_ID = 'EX-KYIV-OWA-2026'

export const SHOWCASE_SCENARIO_ID = 'ukraine-owa-intercept-vignette'

export const SHOWCASE_EXERCISE_SUBTITLE =
  'Kyiv OWA intercept · layered C-UAS · Turn 12 adjudicated snapshot'

/** Legacy URL slug — redirect to showcase ID in routes. */
export const LEGACY_EXERCISE_IDS = ['demo-exercise'] as const

export function normalizeExerciseId(id: string): string {
  if ((LEGACY_EXERCISE_IDS as readonly string[]).includes(id)) {
    return SHOWCASE_EXERCISE_ID
  }
  return id
}
