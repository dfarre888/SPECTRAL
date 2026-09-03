/**
 * Catalogue data-gap register.
 *
 * 667 of 855 catalogue platforms carry no sensor fit. That is not a defect to
 * be hidden — it is the honest state of an OSINT dataset, and stating it is a
 * stronger position than a polished report that quietly interpolates.
 *
 * A flat count is not actionable though, so gaps are scored. What matters is
 * not how many are missing but which ones change an answer: a Red air-defence
 * radar with no sensor fit silently weakens every threat assessment that
 * includes it, while a missing fit on a Blue transport aircraft changes very
 * little.
 *
 * This produces the list that closes the loop with a customer: here is exactly
 * what we do not know, ranked by how much it costs you.
 */

export type GapKind = 'sensors' | 'comms' | 'both'

export interface GapPlatform {
  id: string
  label: string
  nation: string
  domain: string
  role: string
  forceSide: string
  kind: GapKind
  /** 0-100. Higher means the gap distorts more analysis. */
  priority: number
  /** Why it scored what it did — shown to the user, never a bare number. */
  reasons: string[]
}

export interface GapReport {
  totalPlatforms: number
  gapPlatforms: number
  gapPct: number
  byDomain: { domain: string; total: number; gaps: number; pct: number }[]
  byNation: { nation: string; total: number; gaps: number; pct: number }[]
  /** Highest-priority gaps first. */
  ranked: GapPlatform[]
}

export interface GapSourceRow {
  id?: string
  short_name?: string
  designation?: string
  domain?: string
  role?: string
  force_side?: string
  sensors?: unknown[]
  comms?: unknown[]
}

/**
 * Roles whose sensor fit drives threat assessment directly. A missing fit here
 * propagates into detection, masking and kill-chain results.
 */
const HIGH_IMPACT_ROLES = new Set([
  'sam', 'air_defence', 'air_defense', 'ew', 'radar', 'aew_c', 'isr', 'sead',
])

const DOMAIN_WEIGHT: Record<string, number> = {
  air: 1.0,
  maritime: 0.85,
  ground: 0.7,
}

function nationOf(id: string): string {
  return id.split('-')[0] || '?'
}

export function scoreGap(row: GapSourceRow): GapPlatform | null {
  const hasSensors = Array.isArray(row.sensors) && row.sensors.length > 0
  const hasComms = Array.isArray(row.comms) && row.comms.length > 0
  if (hasSensors && hasComms) return null

  const kind: GapKind = !hasSensors && !hasComms ? 'both' : !hasSensors ? 'sensors' : 'comms'
  const domain = row.domain ?? 'unknown'
  const role = (row.role ?? '').toLowerCase()
  const side = row.force_side ?? 'unknown'
  const reasons: string[] = []

  let score = 40
  reasons.push(kind === 'both' ? 'No sensor or comms fit' : `No ${kind} fit`)

  if (HIGH_IMPACT_ROLES.has(role)) {
    score += 30
    reasons.push(`${role} drives threat assessment directly`)
  }
  if (side === 'red') {
    score += 15
    reasons.push('Red platform — gap understates the threat')
  }
  if (kind === 'both') {
    score += 10
    reasons.push('Nothing recorded at all')
  }
  // A platform with comms but no sensors is partially specified, which is
  // worse than an untouched record: it looks complete at a glance.
  if (kind === 'sensors' && hasComms) {
    score += 5
    reasons.push('Partially specified — reads as complete but is not')
  }

  score = Math.round(score * (DOMAIN_WEIGHT[domain] ?? 0.7))

  return {
    id: row.id ?? 'unknown',
    label: row.short_name ?? row.designation ?? row.id ?? 'unknown',
    nation: nationOf(row.id ?? ''),
    domain,
    role: row.role ?? 'unknown',
    forceSide: side,
    kind,
    priority: Math.max(0, Math.min(100, score)),
    reasons,
  }
}

export function buildGapReport(rows: readonly GapSourceRow[]): GapReport {
  const ranked: GapPlatform[] = []
  const domainTotals = new Map<string, { total: number; gaps: number }>()
  const nationTotals = new Map<string, { total: number; gaps: number }>()

  for (const row of rows) {
    const domain = row.domain ?? 'unknown'
    const nation = nationOf(row.id ?? '')
    if (!domainTotals.has(domain)) domainTotals.set(domain, { total: 0, gaps: 0 })
    if (!nationTotals.has(nation)) nationTotals.set(nation, { total: 0, gaps: 0 })
    domainTotals.get(domain)!.total++
    nationTotals.get(nation)!.total++

    const gap = scoreGap(row)
    if (gap) {
      ranked.push(gap)
      domainTotals.get(domain)!.gaps++
      nationTotals.get(nation)!.gaps++
    }
  }

  ranked.sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label))

  const pct = (g: number, t: number) => (t === 0 ? 0 : Math.round((g / t) * 100))

  return {
    totalPlatforms: rows.length,
    gapPlatforms: ranked.length,
    gapPct: pct(ranked.length, rows.length),
    byDomain: [...domainTotals.entries()]
      .map(([domain, v]) => ({ domain, total: v.total, gaps: v.gaps, pct: pct(v.gaps, v.total) }))
      .sort((a, b) => b.gaps - a.gaps),
    byNation: [...nationTotals.entries()]
      .map(([nation, v]) => ({ nation, total: v.total, gaps: v.gaps, pct: pct(v.gaps, v.total) }))
      .sort((a, b) => b.gaps - a.gaps),
    ranked,
  }
}

/**
 * One-line summary suitable for a brief.
 *
 * States the gap plainly. A customer who is told 78% of records lack a sensor
 * fit trusts the 22% far more than one handed a dataset that looks complete.
 */
export function gapHeadline(report: GapReport): string {
  const top = report.ranked.slice(0, 3).map((g) => g.label).join(', ')
  return (
    `${report.gapPlatforms} of ${report.totalPlatforms} catalogue platforms (${report.gapPct}%) ` +
    `carry no sensor or comms fit. Highest-impact gaps: ${top || 'none'}.`
  )
}
