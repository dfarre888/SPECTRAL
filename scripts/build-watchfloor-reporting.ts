/**
 * Watchfloor reporting collector. Run on a CONNECTED machine.
 *
 *   npx tsx scripts/build-watchfloor-reporting.ts [--days 3] [--window 14] [--out data/intel/reporting]
 *
 * Pulls headlines (never article text) from newsrooms, government release
 * feeds, think tanks and maritime advisories, tags each one by topic, and
 * merges it into a rolling window the deployed instance reads. Sources that
 * do not publish a feed are reached through Google News site searches, which
 * name the original outlet.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  keepItem, mergeWindow, parseFeed, toItem,
  type ReportingFile, type ReportingItem, type ReportingStream,
} from '../lib/intel/reporting'

const execFileP = promisify(execFile)
const args = process.argv.slice(2)
const arg = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const DAYS = Number(arg('--days', '3'))
const WINDOW = Number(arg('--window', '14'))
const OUT = arg('--out', 'data/intel/reporting')
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) spectral-watchfloor/0.2'
const PER_SOURCE_CAP = 25

interface Source {
  label: string
  stream: ReportingStream
  /** A direct feed URL, or a Google News query. */
  feed?: string
  gnews?: string
  /** General newsroom: keep only core topics or Australian items. */
  general?: boolean
  /** Mainstream newsroom: the headline itself must be about defence. */
  defenceOnly?: boolean
}

const SOURCES: Source[] = [
  // Official releases
  { label: 'Department of Defence (Australia)', stream: 'official', gnews: 'site:defence.gov.au' },
  { label: 'Defence ministers (Australia)', stream: 'official', gnews: 'site:minister.defence.gov.au' },
  { label: 'Australian Army, Navy and Air Force', stream: 'official', gnews: 'site:army.gov.au OR site:navy.gov.au OR site:airforce.gov.au' },
  { label: 'US Department of Defense', stream: 'official', feed: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=30', general: true },
  { label: 'UK Ministry of Defence', stream: 'official', feed: 'https://www.gov.uk/government/organisations/ministry-of-defence.atom', general: true },
  { label: 'NATO', stream: 'official', gnews: 'site:nato.int', general: true },
  // News channels: Australian and specialist defence press
  { label: 'Defence Connect', stream: 'news', gnews: 'site:defenceconnect.com.au' },
  { label: 'Australian Defence Magazine', stream: 'news', gnews: 'site:australiandefence.com.au' },
  { label: 'Asia-Pacific Defence Reporter', stream: 'news', gnews: 'site:asiapacificdefencereporter.com' },
  { label: 'CONTACT Air Land & Sea', stream: 'news', feed: 'https://contactairlandandsea.com/feed/' },
  { label: 'ABC News', stream: 'news', gnews: 'site:abc.net.au (defence OR military OR drone OR ADF)', defenceOnly: true },
  { label: 'Breaking Defense', stream: 'news', feed: 'https://breakingdefense.com/feed/', general: true },
  { label: 'Defense News', stream: 'news', feed: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', general: true },
  { label: 'Naval News', stream: 'news', feed: 'https://www.navalnews.com/feed/', general: true },
  { label: 'USNI News', stream: 'news', feed: 'https://news.usni.org/feed', general: true },
  // News channels: regional newsrooms
  { label: 'The Diplomat', stream: 'news', feed: 'https://thediplomat.com/feed/', general: true },
  { label: 'CNA', stream: 'news', feed: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511', general: true },
  { label: 'Radio Free Asia', stream: 'news', feed: 'https://www.rfa.org/english/RSS', general: true },
  { label: 'Yonhap (North Korea desk)', stream: 'news', feed: 'https://en.yna.co.kr/RSS/nk.xml', general: true },
  { label: 'Taipei Times', stream: 'news', feed: 'https://www.taipeitimes.com/xml/index.rss', general: true, defenceOnly: true },
  { label: 'The Guardian (World)', stream: 'news', feed: 'https://www.theguardian.com/world/rss', general: true, defenceOnly: true },
  // Topic sweeps across all outlets
  { label: 'Topic: LAND 156', stream: 'news', gnews: '"LAND 156" OR "counter-drone" Australia' },
  { label: 'Topic: Talisman Sabre', stream: 'news', gnews: '"Talisman Sabre"' },
  { label: 'Topic: Australian Army drones', stream: 'news', gnews: '"Australian Army" (drone OR drones OR FPV OR robotic)' },
  { label: 'Topic: ASCA', stream: 'news', gnews: '"Advanced Strategic Capabilities Accelerator" OR ASCA Defence' },
  { label: 'Topic: Ghost Bat and Ghost Shark', stream: 'news', gnews: '"Ghost Bat" OR "Ghost Shark" OR MQ-28' },
  // Analysis
  { label: 'ASPI The Strategist', stream: 'analysis', feed: 'https://www.aspistrategist.org.au/feed/', general: true },
  { label: 'Lowy Institute, The Interpreter', stream: 'analysis', feed: 'https://www.lowyinstitute.org/the-interpreter/rss.xml', general: true },
  { label: 'Institute for the Study of War', stream: 'analysis', gnews: 'site:understandingwar.org', general: true },
  { label: 'CSIS', stream: 'analysis', gnews: 'site:csis.org (drone OR missile OR "electronic warfare" OR China OR Indo-Pacific)', general: true },
  { label: 'RUSI', stream: 'analysis', gnews: 'site:rusi.org', general: true },
  // Advisories
  { label: 'UKMTO maritime advisories (as reported)', stream: 'advisories', gnews: 'UKMTO (vessel OR incident OR advisory)' },
  { label: 'Maritime security advisories (as reported)', stream: 'advisories', gnews: '"maritime security advisory" OR MARAD advisory' },
  { label: 'GNSS interference warnings (as reported)', stream: 'advisories', gnews: '("GPS interference" OR "GNSS interference" OR "GPS jamming") (NOTAM OR warning OR advisory)' },
]

async function fetchText(url: string): Promise<string | null> {
  try {
    const { stdout } = await execFileP('curl', ['-sL', '--max-time', '25', '-A', UA, url], { maxBuffer: 20 * 1024 * 1024 })
    return stdout
  } catch {
    return null
  }
}

function gnewsUrl(q: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${DAYS}d`)}&hl=en-AU&gl=AU&ceid=AU:en`
}

function latestPrevious(dir: string): ReportingItem[] {
  try {
    const f = readdirSync(dir).filter((n) => n.endsWith('.json')).sort().pop()
    if (!f) return []
    return (JSON.parse(readFileSync(join(dir, f), 'utf8')) as ReportingFile).items ?? []
  } catch {
    return []
  }
}

async function main() {
  const since = Date.now() - DAYS * 86_400_000
  const incoming: ReportingItem[] = []
  const reached: string[] = []
  for (const s of SOURCES) {
    const url = s.feed ?? gnewsUrl(s.gnews!)
    const xml = await fetchText(url)
    if (!xml) {
      console.log(`${s.label}: unreachable`)
      continue
    }
    const entries = parseFeed(xml, s.label, since)
    let kept = 0
    for (const e of entries) {
      // One busy source (advisories, wire topics) must not crowd out the rest.
      if (kept >= PER_SOURCE_CAP) break
      const item = toItem(e, s.stream)
      if (!keepItem(item.title, item.topics, !!s.general, item.australian, !!s.defenceOnly)) continue
      incoming.push(item)
      kept++
    }
    if (entries.length > 0) reached.push(s.label)
    console.log(`${s.label}: ${entries.length} in window, ${kept} kept`)
    // Be polite to Google News between queries.
    if (s.gnews) await new Promise((r) => setTimeout(r, 1200))
  }

  mkdirSync(OUT, { recursive: true })
  const items = mergeWindow(latestPrevious(OUT), incoming, Date.now(), WINDOW, 400)
  const file: ReportingFile = {
    generatedAt: new Date().toISOString(),
    windowDays: WINDOW,
    sources: reached,
    items,
  }
  const name = `${new Date().toISOString().slice(0, 10)}.json`
  writeFileSync(join(OUT, name), JSON.stringify(file, null, 1))
  const au = items.filter((i) => i.australian).length
  console.log(`Wrote ${join(OUT, name)}: ${items.length} items (${au} Australian) from ${reached.length} sources`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
