import { describe, expect, it } from 'vitest'
import {
  classifyHeadline, clusterGpsJam, corroborate, extractPlatforms, gpsJamClusterToIncident, leadToIncident, locateHeadline, mergeClustersByTheatre, parseGpsJamCsv,
} from './osint-harvest'

const cat = [{ id: 'RUS-CAT-SHAHED', names: ['Shahed-136', 'Geran-2'] }, { id: 'UKR-CAT-MAGURA', names: ['Magura V5', 'Magura'] }, { id: 'X', names: ['AI'] }]

describe('osint harvest', () => {
  it('classifies headlines by the most specific rule', () => {
    expect(classifyHeadline('Ukraine says GPS jamming hit flights near Kaliningrad')).toBe('gnss_denial')
    expect(classifyHeadline('Russia launches wave of drones on Kyiv')).toBe('swarm')
    expect(classifyHeadline('Air defence shot down 40 Shahed drones overnight')).toBe('intercept')
    expect(classifyHeadline('Drone strike hits refinery in Ryazan')).toBe('uas_strike')
    expect(classifyHeadline('Prime minister visits factory')).toBe('other')
  })
  it('locates by first gazetteer hit and never invents a place', () => {
    expect(locateHeadline('Houthis claim attack on tanker in Red Sea')?.key).toBe('red-sea')
    expect(locateHeadline('Drone strike on a factory')).toBeNull()
  })
  it('extracts platforms on word boundaries and ignores short names', () => {
    expect(extractPlatforms('40 Shahed-136 drones intercepted; AI used in targeting', cat)).toEqual(['RUS-CAT-SHAHED'])
    expect(extractPlatforms('Magura sea drones hit a corvette', cat)).toEqual(['UKR-CAT-MAGURA'])
  })
  it('grades leads by independent outlets, tier-1 lifting a pair to corroborated', () => {
    const a = (domain: string, title: string) => ({ url: `https://${domain}/x`, title, seendate: '20260913T091500Z', domain })
    const leads = corroborate([
      a('reuters.com', 'Drone strike hits Kyiv power plant'),
      a('smallblog.net', 'Kyiv drone attack overnight'),
      a('other.example', 'Drone strike in Sudan'),
    ], cat)
    const kyiv = leads.find((l) => l.theatre.key === 'ukraine')!
    expect(kyiv.grade).toBe('corroborated')
    expect(kyiv.headline).toBe('Drone strike hits Kyiv power plant')
    expect(leads.find((l) => l.theatre.key === 'sudan')!.grade).toBe('single-source')
    const inc = leadToIncident(kyiv)
    expect(inc.confidence).toBe('probable')
    expect(inc.lat).toBe(49.0)
    expect(inc.summary).toContain('theatre-level')
  })
  it('parses gpsjam csv and clusters bad cells by 2° grid', () => {
    const csv = 'hex,count_good_aircraft,count_bad_aircraft\nA,2,8\nB,1,9\nC,50,0\nD,0,1\n'
    const cells = parseGpsJamCsv(csv)
    expect(cells).toHaveLength(4)
    const ll: Record<string, [number, number]> = { A: [54.7, 20.5], B: [54.9, 20.8], C: [48, 2], D: [10, 10] }
    const clusters = clusterGpsJam(cells, (h) => ll[h])
    expect(clusters).toHaveLength(1)
    expect(clusters[0].cells).toBe(2)
    expect(clusters[0].theatre?.key).toBe('baltic')
    const inc = gpsJamClusterToIncident(clusters[0], '2026-09-13')
    expect(inc.incident_type).toBe('gnss_denial')
    expect(inc.confidence).toBe('probable')
  })
  it('merges grid clusters that fall in the same theatre into one lead', () => {
    const t = { key: 'baltic', name: 'Baltic', lat: 57.5, lon: 20.0, match: [] }
    const merged = mergeClustersByTheatre([
      { lat: 55, lon: 20, cells: 3, bad: 30, good: 100, theatre: t },
      { lat: 57, lon: 22, cells: 2, bad: 10, good: 50, theatre: t },
      { lat: 10, lon: 10, cells: 1, bad: 6, good: 1, theatre: null },
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({ cells: 5, bad: 40, good: 150 })
    expect(merged[0].lat).toBeCloseTo(55.5, 1)
  })
})

import { googleNewsToArticles, milAircraftByTheatre, parseFirmsCsv, thermalNear, withThermal } from './osint-harvest'

describe('osint harvest — open-feed additions', () => {
  it('reads Google News items and grades on the originating outlet', () => {
    const xml = `<rss><channel><item><title>Drone strike hits Kyiv depot - Reuters</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Sun, 13 Sep 2026 09:15:00 GMT</pubDate><source url="https://www.reuters.com">Reuters</source></item></channel></rss>`
    const a = googleNewsToArticles(xml, Date.parse('2026-09-12T00:00:00Z'))
    expect(a).toHaveLength(1)
    expect(a[0].domain).toBe('reuters.com')
    expect(a[0].title).toBe('Drone strike hits Kyiv depot')
    expect(a[0].seendate).toBe('20260913T091500Z')
    expect(googleNewsToArticles(xml, Date.parse('2026-09-14T00:00:00Z'))).toHaveLength(0)
  })
  it('counts high-confidence thermal anomalies near a point and attaches evidence', () => {
    const csv = 'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n49.1,31.6,330,0.4,0.4,2026-09-13,0115,N,nominal,2.0NRT,300,5,N\n49.2,31.4,330,0.4,0.4,2026-09-13,0115,N,low,2.0NRT,300,1,N\n10,10,330,0.4,0.4,2026-09-13,0115,N,high,2.0NRT,300,9,N\n'
    const fires = parseFirmsCsv(csv)
    expect(fires).toHaveLength(3)
    expect(thermalNear(fires, 49.0, 31.5, 150)).toBe(1)
    const inc = withThermal({ id: 'x', conflict_name: 'Ukraine', incident_title: 't', incident_type: 'uas_strike', occurred_at: '2026-09-13T00:00:00Z', lat: 49, lon: 31.5, summary: '', source_ref: '', platforms_involved: [], confidence: 'possible', classification: 'U', created_at: '', evidence: { outlets: 2, tier1: 1 } }, fires)
    expect(inc.evidence).toEqual({ outlets: 2, tier1: 1, thermal24h: 1, thermalKm: 150 })
  })
  it('bins military aircraft to theatres and lists top types', () => {
    const out = milAircraftByTheatre([
      { hex: 'a', t: 'RC135', lat: 46.5, lon: 30.5 },
      { hex: 'b', t: 'RC135', lat: 45.0, lon: 29.0 },
      { hex: 'c', t: 'KC135', lat: 44.5, lon: 28.5 },
      { hex: 'd', t: 'C17', lat: -33.0, lon: 151.0 },
      { hex: 'e' },
    ])
    expect(out[0].airborne).toBe(3)
    expect(out[0].types[0]).toEqual({ type: 'RC135', n: 2 })
    expect(out.find((t) => t.key === 'baltic')).toBeUndefined()
  })
})
