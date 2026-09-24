/**
 * Live provenance counts for the Trust page, read from the database this
 * instance is connected to. Every query can fail independently; a failed
 * dataset is reported as unavailable rather than guessed.
 */
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { classifySource, sourceTypeLabel, type SourceTypeId } from './source-types'

export interface GradeCount {
  grade: string
  count: number
}

export interface DatasetProvenance {
  id: string
  label: string
  table: string
  /** null when the query failed. */
  total: number | null
  grades: GradeCount[]
  /** Records with no citation at all. */
  uncited: number
  citations: number
  error: string | null
}

export interface SourceTypeCount {
  id: SourceTypeId
  label: string
  count: number
  example: string | null
}

export interface ProvenanceSummary {
  datasets: DatasetProvenance[]
  sourceTypes: SourceTypeCount[]
  totalCitations: number
  /** Platform rows whose `source` column says osint, of all platform rows. */
  osintPlatforms: { osint: number; total: number } | null
}

const GRADE_ORDER = ['confirmed', 'high', 'probable', 'assessed', 'medium', 'possible', 'reported', 'low', 'estimated', 'unconfirmed']

export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s
}

export function tallyGrades(values: (string | null | undefined)[]): GradeCount[] {
  const m = new Map<string, number>()
  for (const v of values) {
    const k = (v ?? '').trim().toLowerCase() || 'ungraded'
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  const rank = (g: string) => {
    const i = GRADE_ORDER.indexOf(g)
    return i < 0 ? GRADE_ORDER.length + (g === 'ungraded' ? 1 : 0) : i
  }
  return [...m.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1])
    .map(([grade, count]) => ({ grade: titleCase(grade), count }))
}

type Row = { grade?: string | null; sources?: unknown; ref?: unknown }

/**
 * @param refCol optional single-citation column used when `sources` is empty
 *   (curated incidents carry `source_ref`).
 */
async function readDataset(
  id: string,
  label: string,
  table: string,
  gradeCol: string,
  sink: string[],
  refCol?: string,
): Promise<DatasetProvenance> {
  const base: DatasetProvenance = { id, label, table, total: null, grades: [], uncited: 0, citations: 0, error: null }
  try {
    const supabase = await createClient()
    const cols = `grade:${gradeCol}, sources${refCol ? `, ref:${refCol}` : ''}`
    const { data, error } = await supabase.from(table).select(cols).limit(5000)
    if (error) return { ...base, error: error.message }
    const rows = (data ?? []) as unknown as Row[]
    let uncited = 0
    let citations = 0
    for (const r of rows) {
      let list = Array.isArray(r.sources) ? (r.sources as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
      if (list.length === 0 && typeof r.ref === 'string' && r.ref.trim() !== '') list = [r.ref.trim()]
      if (list.length === 0) uncited++
      citations += list.length
      sink.push(...list)
    }
    return { ...base, total: rows.length, grades: tallyGrades(rows.map((r) => r.grade)), uncited, citations }
  } catch (err) {
    return { ...base, error: (err as Error).message }
  }
}

export function tallySourceTypes(citations: string[]): SourceTypeCount[] {
  const m = new Map<SourceTypeId, { count: number; example: string | null }>()
  for (const c of citations) {
    const id = classifySource(c)
    const e = m.get(id) ?? { count: 0, example: null }
    e.count++
    e.example ??= c
    m.set(id, e)
  }
  return [...m.entries()]
    .map(([id, v]) => ({ id, label: sourceTypeLabel(id), count: v.count, example: v.example }))
    .sort((a, b) => (a.id === 'other' ? 1 : b.id === 'other' ? -1 : b.count - a.count))
}

export async function fetchProvenance(): Promise<ProvenanceSummary> {
  const citations: string[] = []
  const datasets = await Promise.all([
    readDataset('platforms', 'Platform library', 'platforms', 'data_confidence', citations),
    readDataset('cuas', 'Counter-UAS systems', 'anti_drone_systems', 'data_confidence', citations),
    readDataset('incidents', 'Curated incidents', 'conflict_incidents', 'confidence', citations, 'source_ref'),
  ])

  let osintPlatforms: ProvenanceSummary['osintPlatforms'] = null
  try {
    const supabase = await createClient()
    const [all, osint] = await Promise.all([
      supabase.from('platforms').select('id', { count: 'exact', head: true }),
      supabase.from('platforms').select('id', { count: 'exact', head: true }).ilike('source', 'osint'),
    ])
    if (!all.error && !osint.error && all.count != null && osint.count != null) {
      osintPlatforms = { osint: osint.count, total: all.count }
    }
  } catch {
    osintPlatforms = null
  }

  return { datasets, sourceTypes: tallySourceTypes(citations), totalCitations: citations.length, osintPlatforms }
}
