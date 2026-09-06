/**
 * Aggregation for the defeat heat map.
 *
 * The previous heat map drew one column per platform. With 477 platforms at
 * 52px that is a grid roughly 25,000px wide, and the rotated column labels were
 * tall enough to push the coloured cells below the fold — so the one thing a
 * heat map exists to do, letting you see the pattern at a glance, was the one
 * thing it could not do.
 *
 * A heat map has to aggregate. Collapsing 477 platforms into threat classes
 * turns 51,000 cells into a few hundred and answers the question a planner
 * actually asks: which effector class works against which class of threat.
 * Individual platforms remain available in the table view.
 *
 * Median rather than mean: Pk within a class is skewed by a handful of
 * outliers, and a median says "the typical platform in this class" — which is
 * what the cell is claiming.
 */

export interface ThreatClassDef {
  id: string
  label: string
  /** Short label for a narrow column head. */
  short: string
}

export const THREAT_CLASSES: ThreatClassDef[] = [
  { id: 'male_hale', label: 'MALE / HALE', short: 'MALE' },
  { id: 'fpv', label: 'FPV', short: 'FPV' },
  { id: 'owa', label: 'OWA / Loitering', short: 'OWA' },
  { id: 'missiles', label: 'Ballistic & Cruise', short: 'MSL' },
  { id: 'cots', label: 'COTS', short: 'COTS' },
  { id: 'other', label: 'Other / tactical', short: 'OTHER' },
]

export interface HeatSample {
  /** null means no assessment on record — distinct from a Pk of zero. */
  pct: number | null
  immune: boolean
  confidence?: string
}

export interface HeatCell {
  systemId: string
  classId: string
  /** Median Pk across assessed, non-immune platforms in the class. */
  medianPct: number | null
  /** Platforms in this class that carry an assessment. */
  assessedCount: number
  /** Platforms in this class at all. */
  totalCount: number
  immuneCount: number
  /** Weakest provenance across the sample. */
  confidence: string
}

const CONF_RANK: Record<string, number> = { high: 0, medium: 1, estimated: 2 }

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export function aggregateCell(
  systemId: string,
  classId: string,
  samples: readonly HeatSample[],
): HeatCell {
  const immuneCount = samples.filter((s) => s.immune).length
  // Immune platforms are excluded from the median: including them as zero would
  // read as "this effector is weak here" when the truth is "it cannot apply".
  const assessed = samples.filter((s) => !s.immune && s.pct != null)
  let confidence = 'high'
  for (const s of samples) {
    const c = s.confidence ?? 'estimated'
    if ((CONF_RANK[c] ?? 2) > (CONF_RANK[confidence] ?? 0)) confidence = c
  }
  return {
    systemId,
    classId,
    medianPct: median(assessed.map((s) => s.pct as number)),
    assessedCount: assessed.length,
    totalCount: samples.length,
    immuneCount,
    confidence: samples.length === 0 ? 'estimated' : confidence,
  }
}

/** Share of the class carrying an assessment, 0-100. Drives cell opacity. */
export function coveragePct(cell: HeatCell): number {
  if (cell.totalCount === 0) return 0
  return Math.round(((cell.assessedCount + cell.immuneCount) / cell.totalCount) * 100)
}

/**
 * Colour ramp for a median Pk.
 *
 * Sequential dark-to-hot, so higher effectiveness reads as hotter without
 * needing the legend. Null (no data) is deliberately a flat neutral rather than
 * a colour on the ramp — absence of data must not look like a low score.
 */
export function heatColor(medianPct: number | null): string {
  if (medianPct == null) return '#15151f'
  if (medianPct < 15) return '#0b2f22'
  if (medianPct < 30) return '#14532d'
  if (medianPct < 45) return '#3f6212'
  if (medianPct < 60) return '#854d0e'
  if (medianPct < 75) return '#c2410c'
  return '#991b1b'
}

export function heatTextColor(medianPct: number | null): string {
  if (medianPct == null) return '#52525b'
  return medianPct >= 45 ? '#fef3c7' : '#6ee7b7'
}

/** One-line explanation of what a cell is claiming, for the tooltip. */
export function describeCell(cell: HeatCell, systemName: string, className: string): string {
  if (cell.totalCount === 0) return `${systemName} vs ${className}: no platforms in class`
  if (cell.medianPct == null) {
    return `${systemName} vs ${className}: no assessment on record for ${cell.totalCount} platforms`
  }
  const immune = cell.immuneCount > 0 ? `, ${cell.immuneCount} immune` : ''
  return (
    `${systemName} vs ${className}: median Pk ${cell.medianPct}% ` +
    `across ${cell.assessedCount} of ${cell.totalCount} platforms${immune}. ` +
    `Confidence ${cell.confidence}.`
  )
}
