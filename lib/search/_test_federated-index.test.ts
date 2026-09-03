import { describe, expect, it } from 'vitest'
import { federatedSearch } from '@/lib/search/federated-index'
import { SPECTRAL_MODULES } from '@/lib/navigation/modules'

describe('federated search', () => {
  it('returns nothing for an empty query', () => {
    expect(federatedSearch('')).toEqual([])
    expect(federatedSearch('   ')).toEqual([])
  })

  it('can reach every module by its label', () => {
    for (const m of SPECTRAL_MODULES) {
      const hits = federatedSearch(m.label, 50)
      expect(hits.some((h) => h.href === m.href), `${m.label} unreachable`).toBe(true)
    }
  })

  it('ranks module hits above content hits', () => {
    const hits = federatedSearch('spectrum', 50)
    expect(hits[0]?.kind).toBe('module')
  })

  it('links conflict studies to their own detail page', () => {
    const hits = federatedSearch('ukraine', 50)
    const conflict = hits.find((h) => h.kind === 'conflict')
    if (conflict) expect(conflict.href).toMatch(/^\/conflicts\/.+/)
  })

  it('respects the limit', () => {
    expect(federatedSearch('a', 3).length).toBeLessThanOrEqual(3)
  })
})
