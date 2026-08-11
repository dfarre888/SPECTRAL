/** First Friday in August for the given calendar year (NCCD census reference). */
export function firstFridayInAugust(year: number): Date {
  const aug1 = new Date(Date.UTC(year, 7, 1))
  const day = aug1.getUTCDay()
  const daysUntilFriday = (5 - day + 7) % 7
  return new Date(Date.UTC(year, 7, 1 + daysUntilFriday))
}

export function formatCensusDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function buildCensusEvidenceNote(schoolYear: number): string {
  const censusDate = firstFridayInAugust(schoolYear)
  const formatted = formatCensusDate(censusDate)
  return (
    `Evidence of adjustments must be documented across at least 10 school weeks prior to the first Friday in August ${schoolYear} ` +
    `(NCCD census date: ${formatted}). Weeks need not be consecutive for QDTP, Supplementary, and Substantial levels. ` +
    `Extensive adjustments must be in place at all times.`
  )
}

export function injectCensusEvidenceNote<T extends Record<string, unknown>>(
  monitoringPlan: T,
  schoolYear: number,
): T & { census_evidence_note: string } {
  return {
    ...monitoringPlan,
    census_evidence_note: buildCensusEvidenceNote(schoolYear),
  }
}
