import { describe, expect, it } from 'vitest'
import { FORCE_CATALOG } from '@/data/force-catalog'
import { SENSING_BANDS } from '@/lib/force-catalog/spectrum-bands'

describe('sensor band data provenance', () => {
  const tagged = FORCE_CATALOG.flatMap((p) => p.sensors.filter((s) => s.bands && s.bands.length))
  it('every sensor with stated bands cites a public URL', () => {
    expect(tagged.length).toBeGreaterThan(0)
    for (const s of tagged) expect(s.sources.some((x) => x.startsWith('http'))).toBe(true)
  })
  it('stated bands are in the ribbon vocabulary', () => {
    for (const s of tagged) for (const b of s.bands!) expect(SENSING_BANDS).toContain(b)
  })
  it('F-35 EOTS/DAS is tagged MWIR', () => {
    const f35 = FORCE_CATALOG.find((p) => p.id === 'AUS-CAT-F35A')!
    expect(f35.sensors.find((s) => s.kind === 'eo_ir')?.bands).toEqual(['MWIR'])
  })
})
