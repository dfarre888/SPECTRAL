import { PLATFORMS } from '@/data/seed-platforms'
import { getConflictCaseStudies } from '@/lib/conflicts/seed-queries'
import { SPECTRAL_MODULES } from '@/lib/navigation/modules'

export type SearchHitKind = 'module' | 'platform' | 'conflict'

export interface SearchHit {
  id: string
  label: string
  href: string
  module: string
  kind: SearchHitKind
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((f) => (f ?? '').toLowerCase().includes(query))
}

/**
 * Cross-module quick search behind ⌘K.
 *
 * Modules come first: jumping to a module is the most common reason to open
 * search, and it is the only result kind that covers the whole app.
 */
export function federatedSearch(query: string, limit = 12): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const hits: SearchHit[] = []

  for (const m of SPECTRAL_MODULES) {
    if (matches(q, m.label, m.sub, m.kicker, m.blurb, m.id)) {
      hits.push({
        id: m.id,
        label: m.label,
        href: m.href,
        module: 'Module',
        kind: 'module',
      })
    }
  }

  for (const p of PLATFORMS) {
    if (matches(q, p.name, p.id, (p as { country_of_origin?: string }).country_of_origin)) {
      hits.push({
        id: p.id,
        label: p.name,
        href: `/platforms/${p.id}`,
        module: 'Platform Library',
        kind: 'platform',
      })
    }
  }

  for (const c of getConflictCaseStudies()) {
    if (matches(q, c.name, c.region)) {
      hits.push({
        id: c.id,
        label: c.name,
        href: `/conflicts/${c.id}`,
        module: 'Conflict Intel',
        kind: 'conflict',
      })
    }
  }

  return hits.slice(0, limit)
}
