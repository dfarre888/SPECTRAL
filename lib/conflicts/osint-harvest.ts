/**
 * OSINT harvest: turn open news and GNSS-interference feeds into conflict
 * incident leads the air-gapped instance can import as a bundle.
 *
 * Sources (all open, each with its own attribution requirement):
 *   GDELT DOC 2.0  — worldwide news article index (attribution: GDELT Project)
 *   GPSJam         — daily ADS-B-derived GNSS interference by H3 cell
 *                    (John Wiseman, gpsjam.org; attribution required)
 *
 * Everything here is a LEAD, not a finding. A lead is graded by how many
 * independent outlets carried it and never by what any one outlet claimed.
 * Location is theatre-level (a gazetteer hit in the headline), never invented.
 *
 * Pure: no network, no fs. The connected-machine script does the fetching.
 */
import type { ConflictIncident, ConflictIncidentType } from '@/lib/conflicts/types'

export interface GdeltArticle {
  url: string
  title: string
  /** GDELT seendate, e.g. 20260913T091500Z */
  seendate: string
  domain: string
  language?: string
  sourcecountry?: string
}

export interface Theatre {
  key: string
  name: string
  lat: number
  lon: number
  /** Lower-case tokens that place a headline in this theatre. */
  match: string[]
}

/** Public geography. Centroids are approximate and labelled as theatre-level. */
export const THEATRES: Theatre[] = [
  { key: 'ukraine', name: 'Ukraine', lat: 49.0, lon: 31.5, match: ['ukraine', 'ukrainian', 'kyiv', 'kiev', 'kharkiv', 'odesa', 'odessa', 'dnipro', 'zaporizhzhia', 'donetsk', 'luhansk', 'kherson', 'sumy'] },
  { key: 'crimea', name: 'Crimea', lat: 45.3, lon: 34.4, match: ['crimea', 'sevastopol', 'kerch'] },
  { key: 'russia', name: 'Russia (interior)', lat: 55.7, lon: 37.6, match: ['moscow', 'belgorod', 'kursk', 'bryansk', 'ryazan', 'tatarstan', 'novorossiysk', 'engels'] },
  { key: 'red-sea', name: 'Red Sea / Yemen', lat: 15.0, lon: 42.5, match: ['red sea', 'yemen', 'houthi', 'houthis', 'sanaa', 'hodeidah', 'bab el-mandeb', 'bab al-mandab', 'gulf of aden'] },
  { key: 'gulf', name: 'Gulf / Hormuz', lat: 26.5, lon: 56.3, match: ['hormuz', 'persian gulf', 'arabian gulf', 'bahrain', 'qatar', 'uae', 'abu dhabi', 'dubai', 'kuwait'] },
  { key: 'iran', name: 'Iran', lat: 32.4, lon: 53.7, match: ['iran', 'iranian', 'tehran', 'isfahan', 'natanz'] },
  { key: 'israel-gaza', name: 'Israel / Gaza', lat: 31.5, lon: 34.8, match: ['israel', 'israeli', 'gaza', 'tel aviv', 'idf', 'hamas'] },
  { key: 'lebanon', name: 'Lebanon', lat: 33.9, lon: 35.9, match: ['lebanon', 'lebanese', 'hezbollah', 'beirut'] },
  { key: 'syria', name: 'Syria', lat: 35.0, lon: 38.0, match: ['syria', 'syrian', 'damascus', 'aleppo'] },
  { key: 'iraq', name: 'Iraq', lat: 33.3, lon: 44.4, match: ['iraq', 'iraqi', 'baghdad', 'erbil'] },
  { key: 'taiwan', name: 'Taiwan Strait', lat: 24.0, lon: 120.0, match: ['taiwan', 'taiwanese', 'taipei', 'taiwan strait', 'pla '] },
  { key: 'scs', name: 'South China Sea', lat: 12.0, lon: 115.0, match: ['south china sea', 'scarborough', 'spratly', 'second thomas shoal', 'philippine coast guard'] },
  { key: 'korea', name: 'Korean Peninsula', lat: 38.0, lon: 127.0, match: ['north korea', 'north korean', 'pyongyang', 'south korea', 'dmz'] },
  { key: 'baltic', name: 'Baltic', lat: 57.5, lon: 20.0, match: ['baltic', 'kaliningrad', 'estonia', 'latvia', 'lithuania', 'gulf of finland'] },
  { key: 'poland', name: 'Poland', lat: 52.0, lon: 19.5, match: ['poland', 'polish airspace', 'rzeszow', 'rzeszów'] },
  { key: 'romania', name: 'Romania / Moldova', lat: 45.5, lon: 27.5, match: ['romania', 'romanian', 'moldova', 'transnistria'] },
  { key: 'sudan', name: 'Sudan', lat: 15.6, lon: 32.5, match: ['sudan', 'khartoum', 'darfur', 'el fasher', 'port sudan'] },
  { key: 'sahel', name: 'Sahel', lat: 15.0, lon: 0.0, match: ['mali', 'niger', 'burkina', 'sahel'] },
  { key: 'myanmar', name: 'Myanmar', lat: 19.8, lon: 96.2, match: ['myanmar', 'burma', 'rakhine'] },
  { key: 'india-pak', name: 'India / Pakistan', lat: 32.5, lon: 74.5, match: ['pakistan', 'kashmir', 'punjab', 'jammu', 'lahore', 'islamabad', 'indian army', 'indian air force'] },
  { key: 'libya', name: 'Libya', lat: 30.0, lon: 17.0, match: ['libya', 'tripoli', 'benghazi'] },
]

/** Keyword → incident type. First match wins; order is specificity. */
const TYPE_RULES: { type: ConflictIncidentType; any: string[] }[] = [
  { type: 'gnss_denial', any: ['gps jamming', 'gnss jamming', 'gps spoof', 'gnss spoof', 'gps interference', 'gnss interference', 'navigation interference', 'jamming of gps'] },
  { type: 'swarm', any: ['swarm', 'wave of drones', 'mass drone', 'hundreds of drones', 'dozens of drones'] },
  { type: 'ballistic_strike', any: ['ballistic missile', 'iskander', 'kinzhal', 'fattah', 'atacms', 'kn-23'] },
  { type: 'cruise_strike', any: ['cruise missile', 'kalibr', 'kh-101', 'tomahawk', 'storm shadow', 'scalp'] },
  { type: 'naval', any: ['sea drone', 'naval drone', 'usv', 'unmanned surface', 'magura', 'sea baby', 'warship', 'frigate', 'destroyer', 'tanker struck', 'vessel struck'] },
  { type: 'intercept', any: ['shot down', 'intercepted', 'downed', 'shoots down', 'shoot down', 'destroyed in the air', 'air defence downed', 'air defense downed'] },
  { type: 'ew', any: ['electronic warfare', 'jammer', 'jamming', 'spoofing', 'ew system'] },
  { type: 'isr', any: ['reconnaissance drone', 'surveillance drone', 'spy drone', 'isr drone'] },
  { type: 'uas_strike', any: ['drone strike', 'drone attack', 'uav strike', 'uav attack', 'kamikaze drone', 'fpv', 'shahed', 'geran', 'loitering munition', 'lancet', 'drones struck', 'drones hit', 'drone hit', 'drones attacked', 'drone attacked'] },
  { type: 'strike', any: ['airstrike', 'air strike', 'missile strike', 'struck', 'strike on'] },
]

export function classifyHeadline(title: string): ConflictIncidentType {
  const t = title.toLowerCase()
  for (const r of TYPE_RULES) if (r.any.some((k) => t.includes(k))) return r.type
  return 'other'
}

export function locateHeadline(title: string): Theatre | null {
  const t = ` ${title.toLowerCase()} `
  let best: Theatre | null = null
  let bestPos = Number.POSITIVE_INFINITY
  for (const th of THEATRES) {
    for (const m of th.match) {
      const i = t.indexOf(m)
      if (i >= 0 && i < bestPos) {
        best = th
        bestPos = i
      }
    }
  }
  return best
}

export interface PlatformName {
  id: string
  names: string[]
}

/** Platform ids whose names (≥4 chars, case-insensitive, word-bounded) appear in the headline. */
export function extractPlatforms(title: string, catalog: PlatformName[]): string[] {
  const t = title.toLowerCase()
  const out: string[] = []
  for (const p of catalog) {
    for (const raw of p.names) {
      const n = raw.toLowerCase().trim()
      if (n.length < 4) continue
      const re = new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`)
      if (re.test(t)) {
        out.push(p.id)
        break
      }
    }
  }
  return [...new Set(out)]
}

/** Outlets whose reporting alone lifts a lead a grade. Public, mainstream wires and defence press. */
export const TIER1_DOMAINS = new Set([
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'aljazeera.com', 'afp.com', 'france24.com', 'dw.com',
  'theguardian.com', 'nytimes.com', 'washingtonpost.com', 'ft.com', 'bloomberg.com', 'wsj.com',
  'kyivindependent.com', 'ukrinform.net', 'pravda.com.ua', 'timesofisrael.com', 'haaretz.com',
  'defensenews.com', 'janes.com', 'thedrive.com', 'twz.com', 'breakingdefense.com', 'understandingwar.org',
  'abc.net.au', 'smh.com.au', 'theaustralian.com.au', 'nhk.or.jp', 'yonhapnews.co.kr',
])

export interface OsintLead {
  id: string
  type: ConflictIncidentType
  theatre: Theatre
  /** UTC day, YYYY-MM-DD */
  day: string
  headline: string
  articles: GdeltArticle[]
  domains: string[]
  tier1Count: number
  platforms: string[]
  grade: 'corroborated' | 'reported' | 'single-source'
}

function dayOf(seendate: string): string {
  // 20260913T091500Z → 2026-09-13
  return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`
}

function isoOf(seendate: string): string {
  return `${dayOf(seendate)}T${seendate.slice(9, 11)}:${seendate.slice(11, 13)}:00Z`
}

/**
 * Group articles into leads by (type, theatre, day). Two outlets writing the
 * same day about the same kind of event in the same theatre is the corroboration
 * signal; a single outlet, however loud, stays single-source.
 */
export function corroborate(articles: GdeltArticle[], catalog: PlatformName[]): OsintLead[] {
  const groups = new Map<string, OsintLead>()
  for (const a of articles) {
    const type = classifyHeadline(a.title)
    if (type === 'other') continue
    const theatre = locateHeadline(a.title)
    if (!theatre) continue
    const day = dayOf(a.seendate)
    const key = `${type}|${theatre.key}|${day}`
    let g = groups.get(key)
    if (!g) {
      g = { id: `osint-${key.replace(/[|]/g, '-')}`, type, theatre, day, headline: a.title.trim(), articles: [], domains: [], tier1Count: 0, platforms: [], grade: 'single-source' }
      groups.set(key, g)
    }
    g.articles.push(a)
    if (!g.domains.includes(a.domain)) {
      g.domains.push(a.domain)
      if (TIER1_DOMAINS.has(a.domain)) g.tier1Count += 1
      // Prefer a tier-1 headline as the lead's face.
      if (TIER1_DOMAINS.has(a.domain) && !TIER1_DOMAINS.has(g.articles[0].domain)) g.headline = a.title.trim()
    }
    for (const p of extractPlatforms(a.title, catalog)) if (!g.platforms.includes(p)) g.platforms.push(p)
  }
  for (const g of groups.values()) {
    g.grade = g.domains.length >= 3 || (g.domains.length >= 2 && g.tier1Count >= 1) ? 'corroborated' : g.domains.length === 2 ? 'reported' : 'single-source'
  }
  return [...groups.values()].sort((a, b) => b.day.localeCompare(a.day) || b.domains.length - a.domains.length)
}

/** Confidence wording mirrors the catalogue's NATO-style language, never a number. */
export function gradeToConfidence(grade: OsintLead['grade']): string {
  return grade === 'corroborated' ? 'probable' : grade === 'reported' ? 'possible' : 'unconfirmed'
}

export function leadToIncident(lead: OsintLead): ConflictIncident {
  const first = lead.articles[0]
  return {
    id: lead.id,
    conflict_name: lead.theatre.name,
    incident_title: lead.headline,
    incident_type: lead.type,
    occurred_at: isoOf(first.seendate),
    lat: lead.theatre.lat,
    lon: lead.theatre.lon,
    summary: `${lead.domains.length} outlet${lead.domains.length === 1 ? '' : 's'} (${lead.tier1Count} tier-1) reported ${lead.type.replace(/_/g, ' ')} in ${lead.theatre.name} on ${lead.day}. Location is theatre-level from the headline, not a geocoded strike point. Automated OSINT lead, unverified.`,
    source_ref: lead.articles.slice(0, 6).map((a) => a.url).join(' | '),
    platforms_involved: lead.platforms,
    confidence: gradeToConfidence(lead.grade),
    classification: 'UNCLASSIFIED // OSINT',
    created_at: new Date().toISOString(),
  }
}

/* ---------------- GPSJam ---------------- */

export interface GpsJamCell {
  hex: string
  good: number
  bad: number
}

export function parseGpsJamCsv(csv: string): GpsJamCell[] {
  const out: GpsJamCell[] = []
  for (const line of csv.split('\n').slice(1)) {
    const [hex, g, b] = line.trim().split(',')
    if (!hex) continue
    out.push({ hex, good: Number(g) || 0, bad: Number(b) || 0 })
  }
  return out
}

export interface GpsJamCluster {
  lat: number
  lon: number
  cells: number
  bad: number
  good: number
  theatre: Theatre | null
}

/**
 * Cells with a high share of aircraft reporting degraded navigation, clustered
 * on a 2° grid so one theatre yields one lead rather than forty. Thresholds
 * follow gpsjam's own "red" band (≥10% of aircraft) with a floor on counts so
 * a single aircraft cannot create a lead.
 */
export function clusterGpsJam(
  cells: GpsJamCell[],
  toLatLng: (hex: string) => [number, number],
  opts: { minBadShare?: number; minBad?: number } = {},
): GpsJamCluster[] {
  const minBadShare = opts.minBadShare ?? 0.1
  const minBad = opts.minBad ?? 5
  const grid = new Map<string, GpsJamCluster & { latSum: number; lonSum: number }>()
  for (const c of cells) {
    const tot = c.good + c.bad
    if (!tot || c.bad < minBad || c.bad / tot < minBadShare) continue
    const [lat, lon] = toLatLng(c.hex)
    const key = `${Math.round(lat / 2) * 2}|${Math.round(lon / 2) * 2}`
    let g = grid.get(key)
    if (!g) {
      g = { lat: 0, lon: 0, cells: 0, bad: 0, good: 0, theatre: null, latSum: 0, lonSum: 0 }
      grid.set(key, g)
    }
    g.cells += 1
    g.bad += c.bad
    g.good += c.good
    g.latSum += lat
    g.lonSum += lon
  }
  const out: GpsJamCluster[] = []
  for (const g of grid.values()) {
    const lat = g.latSum / g.cells
    const lon = g.lonSum / g.cells
    out.push({ lat, lon, cells: g.cells, bad: g.bad, good: g.good, theatre: nearestTheatre(lat, lon, 900) })
  }
  return out.sort((a, b) => b.bad - a.bad)
}

/**
 * One lead per theatre: grid clusters that map to the same theatre merge, keeping
 * the bad-weighted centroid. Clusters outside every theatre stay separate.
 */
export function mergeClustersByTheatre(clusters: GpsJamCluster[]): GpsJamCluster[] {
  const byTheatre = new Map<string, GpsJamCluster & { w: number }>()
  const loose: GpsJamCluster[] = []
  for (const c of clusters) {
    if (!c.theatre) {
      loose.push(c)
      continue
    }
    const k = c.theatre.key
    const m = byTheatre.get(k)
    if (!m) {
      byTheatre.set(k, { ...c, w: c.bad })
      continue
    }
    const w = m.w + c.bad
    m.lat = (m.lat * m.w + c.lat * c.bad) / Math.max(1, w)
    m.lon = (m.lon * m.w + c.lon * c.bad) / Math.max(1, w)
    m.w = w
    m.cells += c.cells
    m.bad += c.bad
    m.good += c.good
  }
  return [...byTheatre.values()].map(({ w: _w, ...rest }) => rest).concat(loose).sort((a, b) => b.bad - a.bad)
}

function nearestTheatre(lat: number, lon: number, maxKm: number): Theatre | null {
  let best: Theatre | null = null
  let bestD = maxKm
  for (const t of THEATRES) {
    const d = haversineKm(lat, lon, t.lat, t.lon)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

function haversineKm(a1: number, o1: number, a2: number, o2: number): number {
  const R = 6371
  const dLat = ((a2 - a1) * Math.PI) / 180
  const dLon = ((o2 - o1) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function gpsJamClusterToIncident(c: GpsJamCluster, day: string): ConflictIncident {
  const share = Math.round((c.bad / Math.max(1, c.bad + c.good)) * 100)
  const where = c.theatre ? c.theatre.name : `${c.lat.toFixed(1)}, ${c.lon.toFixed(1)}`
  return {
    id: `gpsjam-${day}-${c.lat.toFixed(0)}-${c.lon.toFixed(0)}`,
    conflict_name: where,
    incident_title: `GNSS interference: ${share}% of ${c.bad + c.good} aircraft reporting degraded navigation near ${where}`,
    incident_type: 'gnss_denial',
    occurred_at: `${day}T12:00:00Z`,
    lat: c.lat,
    lon: c.lon,
    summary: `${c.cells} H3 cells with ≥10% of ADS-B aircraft reporting low navigation integrity on ${day}. Derived from gpsjam.org (ADS-B NIC/NACp), which indicates interference at aircraft altitude, not on the ground. Automated lead.`,
    source_ref: `https://gpsjam.org/?date=${day}`,
    platforms_involved: [],
    confidence: share >= 30 ? 'probable' : 'possible',
    classification: 'UNCLASSIFIED // OSINT',
    created_at: new Date().toISOString(),
  }
}
