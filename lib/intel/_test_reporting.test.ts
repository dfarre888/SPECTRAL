import { describe, expect, it } from 'vitest'
import { keepItem, mergeWindow, parseFeed, toItem, topicsFor, type ReportingItem } from '@/lib/intel/reporting'

const GN = `<rss><channel><title>Google News</title>
<item><title>Leidos demonstrates LAND 156 counter-drone capability - Australian Defence Magazine</title>
<link>https://news.google.com/rss/articles/abc</link><pubDate>Tue, 22 Sep 2026 03:00:00 GMT</pubDate>
<source url="https://www.australiandefence.com.au">Australian Defence Magazine</source></item>
<item><title>Old story - Defence Connect</title><link>https://news.google.com/rss/articles/old</link>
<pubDate>Tue, 01 Jan 2019 03:00:00 GMT</pubDate><source url="https://www.defenceconnect.com.au">Defence Connect</source></item>
</channel></rss>`

const WP = `<rss><channel><title>The Interpreter</title>
<item><title><![CDATA[Why Australia&#8217;s drones need spectrum discipline]]></title>
<link>https://www.lowyinstitute.org/the-interpreter/drones-spectrum</link><pubDate>Wed, 23 Sep 2026 01:00:00 +0000</pubDate></item>
</channel></rss>`

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Ministry of Defence</title>
<entry><title>UK and Australia sign drone cooperation arrangement</title>
<link rel="alternate" type="text/html" href="https://www.gov.uk/government/news/uk-australia-drones"/>
<updated>2026-09-22T10:00:00+01:00</updated></entry></feed>`

describe('Watchfloor reporting topics', () => {
  it('tags counter-drone before general drone news', () => {
    expect(topicsFor('Leidos demonstrates LAND 156 counter-drone capability')[0]).toBe('cuas')
    expect(topicsFor('Army to field FPV strike team for Talisman Sabre 2027')).toEqual(
      expect.arrayContaining(['drones', 'exercises']),
    )
  })

  it('does not tag unrelated headlines', () => {
    expect(topicsFor('Navy band performs at Anzac Day service')).toEqual([])
  })
})

describe('Watchfloor reporting feeds', () => {
  it('parses Google News items, strips the outlet suffix and drops old items', () => {
    const items = parseFeed(GN, 'Google News', Date.parse('2026-09-10T00:00:00Z'))
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Leidos demonstrates LAND 156 counter-drone capability')
    expect(items[0].outlet).toBe('Australian Defence Magazine')
    expect(items[0].domain).toBe('australiandefence.com.au')
  })

  it('parses WordPress feeds with CDATA and entities, using the fallback outlet', () => {
    const [item] = parseFeed(WP, 'Lowy Institute, The Interpreter', 0)
    expect(item.title).toBe("Why Australia's drones need spectrum discipline")
    expect(item.outlet).toBe('Lowy Institute, The Interpreter')
  })

  it('parses Atom feeds such as gov.uk', () => {
    const [item] = parseFeed(ATOM, 'UK Ministry of Defence', 0)
    expect(item.url).toBe('https://www.gov.uk/government/news/uk-australia-drones')
    const full = toItem(item, 'official')
    expect(full.australian).toBe(true)
    expect(full.topics).toContain('drones')
  })

  it('keeps general-news items only when core or Australian', () => {
    const t = 'Global markets react to tariffs'
    expect(keepItem(t, topicsFor(t), true, false)).toBe(false)
    expect(keepItem('Marles signs AI deal', ['trust'], true, true)).toBe(true)
    expect(keepItem('Drone swarm tested', ['drones'], true, false)).toBe(true)
  })
})

describe('Watchfloor reporting window', () => {
  const mk = (id: string, iso: string, topics: string[] = ['drones']): ReportingItem => ({
    id, title: id, url: `https://x/${id}`, outlet: 'X', domain: 'x', stream: 'news', publishedAt: iso, topics, australian: false,
  })

  it('dedupes by id, keeps newest first and drops items outside the window', () => {
    const now = Date.parse('2026-09-24T00:00:00Z')
    const merged = mergeWindow(
      [mk('a', '2026-09-20T00:00:00Z'), mk('old', '2026-08-01T00:00:00Z')],
      [mk('a', '2026-09-20T00:00:00Z', ['drones', 'exercises']), mk('b', '2026-09-23T00:00:00Z')],
      now,
      14,
    )
    expect(merged.map((m) => m.id)).toEqual(['b', 'a'])
    expect(merged[1].topics).toEqual(['drones', 'exercises'])
  })
})
