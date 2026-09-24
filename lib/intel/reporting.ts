/**
 * Watchfloor reporting: what newsrooms, governments, analysts and maritime
 * authorities published, tagged by topic and pointed at the SPECTRAL module
 * that answers it.
 *
 * The incident stream (lib/conflicts) turns reporting into graded incidents
 * with positions. This stream keeps the reporting itself: contracts,
 * exercises, doctrine, programme milestones, assessments, advisories.
 * Headlines and links only; the article text stays with the publisher.
 */
import type { WatchfloorStreamId } from '@/lib/intel/watchfloor'

export type ReportingStream = Extract<WatchfloorStreamId, 'news' | 'official' | 'analysis' | 'advisories'>

export interface ReportingTopic {
  id: string
  label: string
  match: RegExp
  /** Where SPECTRAL covers this topic. */
  module: { href: string; label: string }
}

/** Order matters: the first matching topic is the item's primary topic. */
export const REPORTING_TOPICS: readonly ReportingTopic[] = [
  {
    id: 'cuas',
    label: 'Counter-drone',
    match: /counter[- ]?(drone|uas|uxs|rpas|small)|c-uas|land ?156|anti-drone|droneshield|dronegun|dronebuster|interceptor drone|mission syracuse|drone incursion|drones? (over|near|breach(ed)?) (the )?(raaf|base|airbase|air base|airfield|defence|military)/i,
    module: { href: '/defeat', label: 'Defeat Matrix' },
  },
  {
    id: 'drones',
    label: 'Drones and autonomy',
    match: /\bdrones?\b|uncrewed|unmanned|\buavs?\b|\buas\b|\bfpv\b|loitering munition|robotic|autonomous|\bras\b|ghost bat|mq-28|ghost shark|bluebottle|speartooth|triton|owl-b/i,
    module: { href: '/platforms', label: 'Platform Library' },
  },
  {
    id: 'ew',
    label: 'EW and spectrum',
    match: /electronic warfare|\bew\b|jamm(ing|er)|spectrum|\bgnss\b|\bgps\b|spoof|peregrine|growler|signals intelligence/i,
    module: { href: '/spectrum', label: 'Spectrum View' },
  },
  {
    id: 'iamd',
    label: 'Air and missile defence',
    match: /air (and missile )?defen[cs]e|\bnasams\b|air ?6500|air ?6502|\bsm-[26]\b|patriot|missile defen[cs]e|\bgbad\b|\biamd\b|intercept/i,
    module: { href: '/overlay', label: 'SAM Engagement' },
  },
  {
    id: 'maritime',
    label: 'Maritime security',
    match: /\bukmto\b|shipping|merchant vessel|tanker|red sea|strait of hormuz|houthi|sea drone|naval drone|\busv\b|submarine|frigate|destroyer/i,
    module: { href: '/conflict', label: 'Watchfloor' },
  },
  {
    id: 'exercises',
    label: 'Exercises',
    match: /talisman sabre|pitch black|austral shield|southern arrow|black prince|pozieres run|kakadu|rimpac|balikatan|\bexercise\b/i,
    module: { href: '/arena', label: 'Red/Blue Arena' },
  },
  {
    id: 'strike',
    label: 'Long-range strike',
    match: /\bhimars\b|\bprsm\b|\bgmlrs\b|long-range (strike|fires)|tomahawk|guided weapons|\bgweo\b|hypersonic|\bnsm\b|ballistic missile|cruise missile/i,
    module: { href: '/force-catalog', label: 'Force Catalogue' },
  },
  {
    id: 'wargaming',
    label: 'Wargaming and simulation',
    match: /wargam|simulat|synthetic training|digital twin|decision (advantage|support)/i,
    module: { href: '/pcm', label: 'PCM' },
  },
  {
    id: 'trust',
    label: 'AI, cyber and crypto',
    // AI only when it is about defence; general AI news is not our topic.
    match: /(military|defen[cs]e|\badf\b|army|navy|air force|weapon|warfare|targeting)\b[^.]{0,60}\b(ai|artificial intelligence|machine learning)\b|\b(ai|artificial intelligence|machine learning)\b[^.]{0,60}\b(military|defen[cs]e|\badf\b|army|navy|weapon|warfare|targeting)|quantum|cryptograph|cyber ?(attack|security|defen[cs]e|operations)|essential eight|\bdisp\b|sovereign (ai|data|software)/i,
    module: { href: '/trust', label: 'Trust & Assurance' },
  },
  {
    id: 'acquisition',
    label: 'Acquisition',
    match: /\basca\b|contract|acquisition|procurement|investment program|\biip\b|defence delivery|tender|industry grant/i,
    module: { href: '/acquire', label: 'Acquisition' },
  },
  {
    id: 'region',
    label: 'Region',
    match: /china|\bpla\b|taiwan|south china sea|pacific|papua new guinea|\bpng\b|indonesia|philippines|north korea|\bdprk\b|pyongyang/i,
    module: { href: '/conflicts', label: 'Conflict Intel' },
  },
]

/** Topics that on their own make a general-news item worth keeping. */
const CORE_TOPICS = new Set(['cuas', 'drones', 'ew', 'iamd', 'maritime', 'exercises', 'wargaming', 'strike'])

/** A general Australian newsroom item must be about defence to be kept. */
// "Drone" alone is not enough: police and farm drones are not our topic.
export const DEFENCE_CONTEXT = /defen[cs]e|military|\badf\b|army|navy|air force|\braaf\b|\bran\b|\bhmas\b|soldier|troops|warfare|\bwar\b|missile|marles|conroy|aukus|\bpla\b|submarine|frigate|air ?base|restricted airspace/i

const AUSTRALIAN = /australia|\badf\b|\braaf\b|\bran\b|australian army|canberra|marles|conroy|\bhmas\b|darwin|shoalwater|williamtown|pine gap|aukus/i

export interface ReportingItem {
  id: string
  title: string
  url: string
  outlet: string
  domain: string
  stream: ReportingStream
  /** ISO timestamp. */
  publishedAt: string
  /** Topic ids, primary first. */
  topics: string[]
  /** About Australia or the ADF. */
  australian: boolean
}

export interface ReportingFile {
  generatedAt: string
  windowDays: number
  /** Human-readable source list, carried for attribution. */
  sources: string[]
  items: ReportingItem[]
}

export function topicsFor(title: string): string[] {
  return REPORTING_TOPICS.filter((t) => t.match.test(title)).map((t) => t.id)
}

export function topicById(id: string): ReportingTopic | undefined {
  return REPORTING_TOPICS.find((t) => t.id === id)
}

export function isAustralian(title: string, domain: string): boolean {
  return AUSTRALIAN.test(title) || /\.au$/.test(domain)
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&#8217;|&rsquo;|&apos;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/g, '-')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stableId(url: string, title: string): string {
  // FNV-1a over the canonical title keeps the id stable when Google rewrites
  // its redirect URL between fetches of the same story.
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() || url
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type ParsedEntry = Pick<ReportingItem, 'id' | 'title' | 'url' | 'outlet' | 'domain' | 'publishedAt'>

/**
 * Parse RSS 2.0 (Google News, WordPress, most newsrooms) or Atom (gov.uk).
 * Google News appends " - Outlet" to titles and names the outlet in
 * <source>; other feeds take the outlet passed by the caller.
 */
export function parseFeed(xml: string, fallbackOutlet: string, sinceMs: number): ParsedEntry[] {
  const out: ParsedEntry[] = []
  const atom = /<feed[\s>]/.test(xml) && !/<rss[\s>]/.test(xml)
  const chunks = atom ? xml.split(/<entry[\s>]/).slice(1) : xml.split(/<item[\s>]/).slice(1)
  for (const chunk of chunks) {
    const rawTitle = decode(chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '')
    const url = atom
      ? decode(chunk.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? '')
      : decode(chunk.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '')
    const when = atom
      ? chunk.match(/<(?:published|updated)>([\s\S]*?)<\/(?:published|updated)>/)?.[1]
      : chunk.match(/<(?:pubDate|dc:date)>([\s\S]*?)<\/(?:pubDate|dc:date)>/)?.[1]
    const t = Date.parse(decode(when ?? ''))
    if (!rawTitle || !url || !Number.isFinite(t) || t < sinceMs) continue
    const sourceTag = chunk.match(/<source url="([^"]+)">([\s\S]*?)<\/source>/)
    const outlet = sourceTag ? decode(sourceTag[2]) : fallbackOutlet
    let domain = ''
    try {
      domain = new URL(sourceTag ? sourceTag[1] : url).hostname.replace(/^www\./, '')
    } catch {
      domain = ''
    }
    const title = sourceTag ? rawTitle.replace(new RegExp(`\\s+-\\s+${escapeRe(outlet)}$`), '').trim() : rawTitle
    out.push({ id: stableId(url, title), title, url, outlet, domain, publishedAt: new Date(t).toISOString() })
  }
  return out
}

/**
 * Keep an item when it carries at least one topic. General newsrooms cover
 * everything, so from them keep only core SPECTRAL topics or Australian news.
 */
export function keepItem(
  title: string,
  topics: string[],
  general: boolean,
  australian: boolean,
  needsDefenceContext = false,
): boolean {
  if (topics.length === 0) return false
  if (needsDefenceContext && !DEFENCE_CONTEXT.test(title)) return false
  if (!general) return true
  return australian || topics.some((t) => CORE_TOPICS.has(t))
}

export function toItem(entry: ParsedEntry, stream: ReportingStream): ReportingItem {
  return {
    ...entry,
    stream,
    topics: topicsFor(entry.title),
    australian: isAustralian(entry.title, entry.domain),
  }
}

/** Merge new items into the rolling window: dedupe by id, newest first. */
export function mergeWindow(
  previous: ReportingItem[],
  incoming: ReportingItem[],
  nowMs: number,
  windowDays: number,
  cap = 240,
): ReportingItem[] {
  const since = nowMs - windowDays * 86_400_000
  const byId = new Map<string, ReportingItem>()
  for (const it of [...previous, ...incoming]) {
    if (Date.parse(it.publishedAt) < since) continue
    const existing = byId.get(it.id)
    // Prefer the version with more topics (a later, better-classified fetch).
    if (!existing || it.topics.length > existing.topics.length) byId.set(it.id, it)
  }
  return [...byId.values()]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, cap)
}
