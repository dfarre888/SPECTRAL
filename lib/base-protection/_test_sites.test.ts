import { describe, it, expect } from 'vitest'
import { DEFENCE_SITES, getSite, hasPublicCuas, publicIncidentCount } from '@/lib/base-protection/sites'

describe('Defence site list', () => {
  it('has unique ids and plausible coordinates', () => {
    const ids = new Set(DEFENCE_SITES.map((s) => s.id))
    expect(ids.size).toBe(DEFENCE_SITES.length)
    for (const s of DEFENCE_SITES) {
      if (s.country === 'Australia') {
        expect(s.lat).toBeGreaterThan(-44)
        expect(s.lat).toBeLessThan(-10)
        expect(s.lon).toBeGreaterThan(112)
        expect(s.lon).toBeLessThan(154)
      }
      expect(s.nominalRadiusM).toBeGreaterThan(0)
      expect(s.timeZone).not.toBe('UTC')
    }
  })

  it('cites a source for every public report', () => {
    for (const s of DEFENCE_SITES) {
      for (const r of s.publicReporting) {
        expect(r.sources.length).toBeGreaterThan(0)
        for (const src of r.sources) if (src.url) expect(src.url).toMatch(/^https:\/\//)
      }
    }
  })

  it('shows Darwin as the only site with publicly reported C-UAS', () => {
    expect(DEFENCE_SITES.filter(hasPublicCuas).map((s) => s.id)).toEqual(['raaf-darwin'])
  })

  it('records the public incidents at Williamtown and Al Minhad', () => {
    expect(publicIncidentCount(getSite('raaf-williamtown')!)).toBe(2)
    expect(publicIncidentCount(getSite('al-minhad')!)).toBe(2)
    expect(getSite('al-minhad')!.timeZone).toBe('Asia/Dubai')
  })
})
