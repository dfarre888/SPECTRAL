/**
 * Build a conflict-intel bundle on a CONNECTED machine.
 *
 *   npx tsx scripts/build-intel-bundle.ts [--days 2] [--out data/intel/bundles]
 *
 * Pulls open feeds, turns them into graded leads, and writes a bundle the
 * air-gapped instance can import (lib/conflicts/intel-bundle.ts). Never run
 * on the deployed box; it has no egress by design.
 *
 * Sources and attribution (must travel with any product built on this):
 *   GDELT Project DOC 2.0 API   https://www.gdeltproject.org   (rate: 1 req / 5 s)
 *   GPSJam by John Wiseman      https://gpsjam.org             (attribution required)
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cellToLatLng } from 'h3-js'
import { FORCE_CATALOG } from '../data/force-catalog'
import { buildBundle, validateBundle } from '../lib/conflicts/intel-bundle'
import {
  clusterGpsJam, corroborate, gpsJamClusterToIncident, leadToIncident, mergeClustersByTheatre, parseGpsJamCsv, type GdeltArticle, type PlatformName,
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** fetch first; some hosts (and sandboxes) only let curl out. */
async function getText(url: string): Promise<{ ok: boolean; text: string }> {
  // curl first: a failed fetch still reaches the host and burns the GDELT rate budget.
  {
    try {
      const text = execFileSync('curl', ['-sS', '--compressed', '-m', '40', '-A', UA, '-w', '\n%{http_code}', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
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
  const leads = corroborate([...seen.values()], catalogNames())
  const incidents: ConflictIncident[] = leads.map(leadToIncident)
  console.log(`Leads: ${leads.length} (${leads.filter((l) => l.grade === 'corroborated').length} corroborated)`)

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
  writeFileSync(file, JSON.stringify({ ...bundle, attribution: ['GDELT Project (gdeltproject.org)', 'GPSJam by John Wiseman (gpsjam.org)'] }, null, 2))
  console.log(`Wrote ${file}: ${bundle.manifest.incidentCount} incidents, checksum ${bundle.manifest.checksum}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
