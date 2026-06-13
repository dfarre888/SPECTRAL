import { PLATFORMS } from '@/data/seed-platforms'
import { getConflictCaseStudies } from '@/lib/conflicts/queries'

export interface SearchHit {
  id: string
  label: string
  href: string
  module: string
}

export function federatedSearch(query: string, limit = 12): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const hits: SearchHit[] = []

  for (const p of PLATFORMS) {
    if (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      ((p as { country_of_origin?: string }).country_of_origin ?? '').toLowerCase().includes(q)
    ) {
      hits.push({
        id: p.id,
        label: p.name,
        href: `/platforms/${p.id}`,
        module: 'SPECTRA',
      })
    }
  }

  for (const c of getConflictCaseStudies()) {
    if (c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q)) {
      hits.push({
        id: c.id,
        label: c.name,
        href: '/conflicts',
        module: 'Conflict Intel',
      })
    }
  }

  return hits.slice(0, limit)
}
