/**
 * Build a Watchfloor intel bundle on a CONNECTED machine.
 *
 *   npm run intel:bundle -- [--days 2] [--out data/intel/bundles]
 *
 * If the signing key exists (~/.spectral/keys/intel-signing.key, see
 * scripts/intel-keygen.ts) the bundle is signed with ML-DSA-87 over a SHA-384
 * digest before it is written (lib/trust/bundle-signature.ts). Without the key
 * the bundle is written unsigned and the instance labels it so.
 *
 * Pulls open feeds, turns them into graded leads, and writes a bundle the
 * air-gapped instance can import (lib/conflicts/intel-bundle.ts). Never run
 * on the deployed box; it has no egress by design.
 *
 * Sources and attribution (must travel with any product built on this):
 *   GDELT Project DOC 2.0 API + v2 event exports   https://www.gdeltproject.org
 *   Google News RSS (headline aggregation; outlet taken from <source>)
 *   NASA FIRMS VIIRS active fire (LANCE/FIRMS, NASA)  https://firms.modaps.eosdis.nasa.gov
 *   GPSJam by John Wiseman      https://gpsjam.org             (attribution required)
 *   adsb.lol community ADS-B    https://adsb.lol
 */
import { execFile, execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cellToLatLng } from 'h3-js'
import { FORCE_CATALOG } from '../data/force-catalog'
import { buildBundle, validateBundle } from '../lib/conflicts/intel-bundle'
import { formatKeyId, signBundle } from '../lib/trust/bundle-signature'
import { loadSigningKey } from '../lib/trust/intel-keys'
import {
  clusterGpsJam, corroborate, googleNewsToArticles, gpsJamClusterToIncident, leadToIncident, mergeClustersByTheatre, milAircraftByTheatre,
  parseFirmsCsv, parseGdeltExport, parseGpsJamCsv, theatreSnapshots, withGdelt, withThermal,
  type AdsbAircraft, type FireDetection, type GdeltArticle, type GdeltEvent, type PlatformName,
} from '../lib/conflicts/osint-harvest'
import type { ConflictIncident } from '../lib/conflicts/types'

const args = process.argv.slice(2)
const arg = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const DAYS = Number(arg('--days', '2'))
const OUT = arg('--out', 'data/intel/bundles')
const UA = 'spectral-osint-bundle/0.1 (+contact: operator)'

const QUERIES = [
  '(drone OR UAV OR "loitering munition") (strike OR attack OR struck OR hit)',
  '(drone OR UAV OR Shahed OR Geran) ("shot down" OR intercepted OR downed)',
  '("sea drone" OR "naval drone" OR "unmanned surface") (attack OR struck OR hit)',
  '("GPS jamming" OR "GNSS jamming" OR "GPS spoofing" OR "GPS interference")',
  '("ballistic missile" OR "cruise missile") (strike OR launched OR intercepted)',
  '("drone swarm" OR "wave of drones")',
]

/** Tier-1 and specialist RSS. Robust where GDELT's shared-IP rate limit is not. */
const RSS_FEEDS: { url: string; domain: string }[] = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', domain: 'bbc.co.uk' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', domain: 'aljazeera.com' },
  { url: 'https://kyivindependent.com/feed/', domain: 'kyivindependent.com' },
  { url: 'https://www.ukrinform.net/rss/block-lastnews', domain: 'ukrinform.net' },
  { url: 'https://www.timesofisrael.com/feed/', domain: 'timesofisrael.com' },
  { url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml', domain: 'defensenews.com' },
  { url: 'https://breakingdefense.com/feed/', domain: 'breakingdefense.com' },
  { url: 'https://www.twz.com/feed', domain: 'twz.com' },
  { url: 'https://www.abc.net.au/news/feed/2942460/rss.xml', domain: 'abc.net.au' },
  { url: 'https://rss.dw.com/rdf/rss-en-world', domain: 'dw.com' },
  { url: 'https://www.france24.com/en/rss', domain: 'france24.com' },
]

const RELEVANT = /\b(drone|drones|uav|uas|shahed|geran|loitering|missile|jamming|spoofing|gnss|gps|air defen[cs]e|intercept|swarm|sea drone|usv)\b/i

function rssToArticles(xml: string, domain: string, sinceMs: number): GdeltArticle[] {
  const out: GdeltArticle[] = []
  const items = xml.split(/<item[\s>]/).slice(1)
  for (const it of items) {
    const title = (it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? '').trim()
    const link = (it.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)?.[1] ?? it.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? '').trim()
    const pub = (it.match(/<(?:pubDate|dc:date)>([\s\S]*?)<\/(?:pubDate|dc:date)>/)?.[1] ?? '').trim()
    const t = Date.parse(pub)
    if (!title || !link || !Number.isFinite(t) || t < sinceMs) continue
    if (!RELEVANT.test(title)) continue
    const d = new Date(t)
    const seendate = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
    out.push({ url: link, title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'), seendate, domain, language: 'English' })
  }
  return out
}

const GNEWS_QUERIES = [
  '"drone strike"', '"drone attack"', '"drones shot down" OR "drones intercepted"', '"loitering munition" OR Shahed OR Lancet',
  '"GPS jamming" OR "GPS spoofing" OR "GNSS interference"', '"ballistic missile" strike OR intercepted', '"sea drone" OR "naval drone" OR "unmanned surface vessel"',
  '"air defence" OR "air defense" drones', '"drone swarm"',
]

async function googleNews(q: string, days: number): Promise<GdeltArticle[]> {
  const u = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${days}d`)}&hl=en-US&gl=US&ceid=US:en`
  const { ok, text } = await getText(u)
  return ok ? googleNewsToArticles(text, Date.now() - days * 86_400_000) : []
}

async function firms(): Promise<FireDetection[]> {
  const { ok, text } = await getText('https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv')
  return ok ? parseFirmsCsv(text) : []
}

async function adsbMil(): Promise<AdsbAircraft[]> {
  const { ok, text } = await getText('https://api.adsb.lol/v2/mil')
  if (!ok) return []
  try { return (JSON.parse(text) as { ac?: AdsbAircraft[] }).ac ?? [] } catch { return [] }
}

/** Last 24 h of GDELT 15-minute event exports (96 files, ~70 KB each, no rate limit). */
async function gdeltEvents24h(): Promise<GdeltEvent[]> {
  const out: GdeltEvent[] = []
  const now = new Date(Math.floor(Date.now() / 900_000) * 900_000 - 30 * 60_000)
  const stamps: string[] = []
  for (let i = 0; i < 96; i++) {
    const t = new Date(now.getTime() - i * 900_000)
    stamps.push(t.toISOString().replace(/[-:T]/g, '').slice(0, 12) + '00')
  }
  const one = async (stamp: string) => {
    const url = `https://data.gdeltproject.org/gdeltv2/${stamp}.export.CSV.zip`
    const zip = join(tmpdir(), `gdelt-${stamp}.zip`)
    try {
      await execFileP('curl', ['-sS', '-f', '-m', '60', '-A', UA, '-o', zip, url])
      const { stdout } = await execFileP('unzip', ['-p', zip], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      return parseGdeltExport(stdout)
    } catch {
      return [] // a missing quarter-hour is normal
    }
  }
  for (let i = 0; i < stamps.length; i += 8) {
    const batch = await Promise.all(stamps.slice(i, i + 8).map(one))
    for (const b of batch) out.push(...b)
  }
  return out
}

const execFileP = promisify(execFile)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** fetch first; some hosts (and sandboxes) only let curl out. */
async function getText(url: string): Promise<{ ok: boolean; text: string }> {
  // curl first: a failed fetch still reaches the host and burns the GDELT rate budget.
  {
    try {
      const text = execFileSync('curl', ['-sS', '--compressed', '-m', '180', '-A', UA, '-w', '\n%{http_code}', url], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
      const i = text.lastIndexOf('\n')
      return { ok: text.slice(i + 1).trim() === '200', text: text.slice(0, i) }
    } catch (e) {
      console.warn(`curl failed for ${url}: ${(e as Error).message.slice(0, 80)}`)
    }
  }
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15_000) })
    return { ok: r.ok, text: await r.text() }
  } catch {
    return { ok: false, text: '' }
  }
}

async function gdelt(query: string): Promise<GdeltArticle[]> {
  const u = new URL('https://api.gdeltproject.org/api/v2/doc/doc')
  u.searchParams.set('query', query)
  u.searchParams.set('mode', 'artlist')
  u.searchParams.set('maxrecords', '250')
  u.searchParams.set('format', 'json')
  u.searchParams.set('timespan', `${DAYS * 24}h`)
  u.searchParams.set('sort', 'datedesc')
  const { text } = await getText(u.toString())
  try {
    const j = JSON.parse(text) as { articles?: GdeltArticle[] }
    return (j.articles ?? []).filter((a) => a.language === 'English')
  } catch {
    console.warn(`GDELT non-JSON for "${query.slice(0, 40)}…": ${text.slice(0, 80)}`)
    return []
  }
}

async function gpsjam(day: string): Promise<string | null> {
  const { ok, text } = await getText(`https://gpsjam.org/data/${day}-h3_4.csv`)
  return ok ? text : null
}

function catalogNames(): PlatformName[] {
  return FORCE_CATALOG.map((p) => ({ id: p.id, names: [p.short_name, p.designation] }))
}

async function main() {
  const seen = new Map<string, GdeltArticle>()
  for (const q of QUERIES) {
    const arts = await gdelt(q)
    for (const a of arts) if (!seen.has(a.url)) seen.set(a.url, a)
    console.log(`GDELT "${q.slice(0, 48)}…" → ${arts.length} (unique so far ${seen.size})`)
    await sleep(12_000)
  }
  const since = Date.now() - DAYS * 86_400_000
  for (const f of RSS_FEEDS) {
    const { ok, text } = await getText(f.url)
    const arts = ok ? rssToArticles(text, f.domain, since) : []
    for (const a of arts) if (!seen.has(a.url)) seen.set(a.url, a)
    console.log(`RSS ${f.domain} → ${arts.length} relevant (unique so far ${seen.size})`)
  }
  for (const q of GNEWS_QUERIES) {
    const arts = await googleNews(q, DAYS)
    for (const a of arts) if (!seen.has(a.url)) seen.set(a.url, a)
    console.log(`Google News ${q} → ${arts.length} (unique so far ${seen.size})`)
    await sleep(1500)
  }
  const leads = corroborate([...seen.values()], catalogNames())
  console.log(`Leads: ${leads.length} (${leads.filter((l) => l.grade === 'corroborated').length} corroborated)`)

  const [fires, events, air] = await Promise.all([firms(), gdeltEvents24h(), adsbMil()])
  console.log(`FIRMS: ${fires.length} detections (24 h) · GDELT events: ${events.length} conflict-coded (24 h) · adsb.lol: ${air.length} military aircraft airborne`)
  const incidents: ConflictIncident[] = leads.map(leadToIncident).map((i) => withGdelt(withThermal(i, fires), events))
  const airByTheatre = milAircraftByTheatre(air)
  const snapshots = theatreSnapshots(fires, events, airByTheatre)

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const csv = await gpsjam(yesterday)
  if (csv) {
    const clusters = mergeClustersByTheatre(clusterGpsJam(parseGpsJamCsv(csv), (h) => cellToLatLng(h) as [number, number]))
    for (const c of clusters.slice(0, 30)) incidents.push(gpsJamClusterToIncident(c, yesterday))
    console.log(`GPSJam ${yesterday}: ${clusters.length} interference areas (theatre-merged)`)
  } else {
    console.warn(`GPSJam ${yesterday}: not available yet`)
  }

  const bundle = buildBundle(incidents, { producedBy: `${process.env.USER ?? 'operator'}@connected`, classification: 'UNCLASSIFIED // OSINT' })
  const v = validateBundle(bundle)
  if (!v.ok) throw new Error(`Bundle failed self-validation: ${v.message}`)
  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, `${new Date().toISOString().slice(0, 10)}.json`)
  const out = {
    ...bundle,
    attribution: ['GDELT Project (gdeltproject.org)', 'Google News RSS (outlets as cited)', 'NASA FIRMS / LANCE (firms.modaps.eosdis.nasa.gov)', 'GPSJam by John Wiseman (gpsjam.org)', 'adsb.lol community ADS-B'],
    snapshots: { generatedAt: bundle.manifest.generatedAt, theatres: snapshots },
  }
  // Sign last, over everything above. Any stream added to `out` is covered.
  const key = loadSigningKey()
  const final = key ? signBundle(out, key) : out
  writeFileSync(file, JSON.stringify(final, null, 2))
  console.log(`Wrote ${file}: ${bundle.manifest.incidentCount} incidents, checksum ${bundle.manifest.checksum}`)
  console.log(key ? `Signed ML-DSA-87, key ${formatKeyId(key.keyId)}` : 'UNSIGNED: no signing key on this machine (npm run intel:keygen)')
}

main().catch((e) => { console.error(e); process.exit(1) })
