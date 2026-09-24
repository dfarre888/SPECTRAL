/**
 * Cursor-on-Target (CoT 2.0) writer for the Map Intel laydown.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * One `a-*` event per asset (MIL-STD-2525 derived type), one `u-d-c-c` drawing
 * circle per range ring, and one `b-m-r` route per planned UAS mission. The
 * ATAK data package wraps each event in its own .cot with a MissionPackage
 * manifest so ATAK and WinTAK import the whole laydown in one step.
 */
import { buildStoreZip } from './zip'
import { exportSlug, exportStamp, xmlEscape, type ExportDocument, type ExportItem } from './model'

export interface CotOptions {
  /** Minutes until the events go stale in a TAK client. Planning products default to 24 h. */
  staleMinutes?: number
  /** Include range rings and routes as TAK drawing objects. */
  includeShapes?: boolean
}

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/** Signed 32-bit ARGB integer, as ATAK stores colours. */
export function argbInt(a: number, r: number, g: number, b: number): number {
  return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

const SIDE_RGB: Record<ExportItem['side'], [number, number, number]> = {
  blue: [41, 151, 255],
  red: [255, 92, 110],
  neutral: [251, 191, 36],
}

function f(n: number, dp = 7): string {
  return Number.isFinite(n) ? n.toFixed(dp) : '0'
}

function times(now: Date, staleMinutes: number) {
  const t = now.toISOString()
  return { time: t, start: t, stale: new Date(now.getTime() + staleMinutes * 60_000).toISOString() }
}

function remarksFor(item: ExportItem, doc: ExportDocument): string {
  const parts = [
    `${doc.classification}.`,
    `SPECTRAL laydown "${doc.title}".`,
    `System: ${item.name}.`,
    `Role: ${item.role}.`,
    item.range_m ? `${item.range_kind === 'envelope' ? 'Envelope' : item.range_kind === 'detection' ? 'Detection' : item.range_kind === 'engagement' ? 'Engagement' : 'Defeat'} range ${item.range_m} m.` : '',
    item.bands.length ? `Bands: ${item.bands.join('; ')}.` : '',
    `Source: ${item.source}. Confidence: ${item.confidence}.`,
    'Height is AMSL, geoid separation not applied. Planning position, not a track.',
  ]
  return parts.filter(Boolean).join(' ')
}

/** A single CoT <event> element (no XML declaration). */
export function cotEventXml(item: ExportItem, doc: ExportDocument, now: Date, opts: CotOptions = {}): string {
  const t = times(now, opts.staleMinutes ?? 1440)
  const attrs = [
    `version="2.0"`,
    `uid="${xmlEscape(item.uid)}"`,
    `type="${xmlEscape(item.cotType)}"`,
    `how="h-e"`,
    `time="${t.time}"`,
    `start="${t.start}"`,
    `stale="${t.stale}"`,
  ].join(' ')
  const bands = xmlEscape(item.bands.join('; '))
  return [
    `<event ${attrs}>`,
    `<point lat="${f(item.lat)}" lon="${f(item.lon)}" hae="${f(item.alt_m, 1)}" ce="50.0" le="50.0"/>`,
    '<detail>',
    `<contact callsign="${xmlEscape(item.callsign)}"/>`,
    `<remarks source="SPECTRAL">${xmlEscape(remarksFor(item, doc))}</remarks>`,
    `<spectral kind="${item.kind}" side="${item.side}" role="${xmlEscape(item.role)}" range_m="${item.range_m ?? ''}" bands="${bands}" confidence="${xmlEscape(item.confidence)}" classification="${xmlEscape(doc.classification)}"/>`,
    '</detail>',
    '</event>',
  ].join('')
}

/** Range ring as a TAK drawing circle (u-d-c-c). */
export function cotRingXml(item: ExportItem, doc: ExportDocument, now: Date, opts: CotOptions = {}): string | null {
  if (!item.range_m || item.range_m <= 0) return null
  const t = times(now, opts.staleMinutes ?? 1440)
  const [r, g, b] = SIDE_RGB[item.side]
  const uid = `${item.uid}-ring`
  return [
    `<event version="2.0" uid="${xmlEscape(uid)}" type="u-d-c-c" how="h-e" time="${t.time}" start="${t.start}" stale="${t.stale}">`,
    `<point lat="${f(item.lat)}" lon="${f(item.lon)}" hae="${f(item.alt_m, 1)}" ce="9999999.0" le="9999999.0"/>`,
    '<detail>',
    `<shape><ellipse major="${item.range_m}" minor="${item.range_m}" angle="360"/></shape>`,
    `<strokeColor value="${argbInt(255, r, g, b)}"/>`,
    `<strokeWeight value="2.0"/>`,
    `<fillColor value="${argbInt(40, r, g, b)}"/>`,
    `<contact callsign="${xmlEscape(`${item.callsign} ${item.range_kind ?? 'range'} ring`)}"/>`,
    `<remarks source="SPECTRAL">${xmlEscape(`${doc.classification}. ${item.callsign}: ${item.range_kind ?? 'range'} ring ${item.range_m} m.`)}</remarks>`,
    `<labels_on value="false"/>`,
    `<link uid="${xmlEscape(item.uid)}" type="${xmlEscape(item.cotType)}" relation="p-p"/>`,
    '</detail>',
    '</event>',
  ].join('')
}

/** Planned mission as a TAK route (b-m-r) with checkpoints. */
export function cotRouteXml(item: ExportItem, doc: ExportDocument, now: Date, opts: CotOptions = {}): string | null {
  if (!item.path || item.path.length < 2) return null
  const t = times(now, opts.staleMinutes ?? 1440)
  const [r, g, b] = SIDE_RGB[item.side]
  const uid = `${item.uid}-route`
  const first = item.path[0]
  const links = item.path
    .map(
      (p, i) =>
        `<link uid="${xmlEscape(`${uid}-cp${i}`)}" type="b-m-p-w" callsign="${i === 0 ? 'SP' : i === item.path!.length - 1 ? 'OBJ' : `CP${i}`}" point="${f(p.lat)},${f(p.lon)},${f(p.alt_m, 1)}" relation="c"/>`,
    )
    .join('')
  return [
    `<event version="2.0" uid="${xmlEscape(uid)}" type="b-m-r" how="h-e" time="${t.time}" start="${t.start}" stale="${t.stale}">`,
    `<point lat="${f(first.lat)}" lon="${f(first.lon)}" hae="${f(first.alt_m, 1)}" ce="9999999.0" le="9999999.0"/>`,
    '<detail>',
    links,
    `<link_attr color="${argbInt(255, r, g, b)}" method="Flying" prefix="CP" direction="Infil" routetype="Primary" order="Ascending Check Points"/>`,
    `<strokeColor value="${argbInt(255, r, g, b)}"/>`,
    `<strokeWeight value="3.0"/>`,
    `<contact callsign="${xmlEscape(`${item.callsign} route`)}"/>`,
    `<remarks source="SPECTRAL">${xmlEscape(`${doc.classification}. Planned route for ${item.callsign} (${item.name}).`)}</remarks>`,
    '</detail>',
    '</event>',
  ].join('')
}

/** Every CoT event for the laydown, in a stable order (assets, then rings, then routes). */
export function buildCotEvents(doc: ExportDocument, now = new Date(doc.generatedAt), opts: CotOptions = {}): Array<{ uid: string; xml: string }> {
  const includeShapes = opts.includeShapes ?? true
  const out: Array<{ uid: string; xml: string }> = []
  for (const item of doc.items) out.push({ uid: item.uid, xml: cotEventXml(item, doc, now, opts) })
  if (includeShapes) {
    for (const item of doc.items) {
      const ring = cotRingXml(item, doc, now, opts)
      if (ring) out.push({ uid: `${item.uid}-ring`, xml: ring })
    }
    for (const item of doc.items) {
      const route = cotRouteXml(item, doc, now, opts)
      if (route) out.push({ uid: `${item.uid}-route`, xml: route })
    }
  }
  return out
}

/**
 * All events in one XML document. A single event is written as a plain CoT
 * event file; several are wrapped in an <events> root so the file stays
 * well-formed XML for TAK Server tooling and CoT gateways.
 */
export function buildCotFile(doc: ExportDocument, now = new Date(doc.generatedAt), opts: CotOptions = {}): string {
  const events = buildCotEvents(doc, now, opts)
  if (events.length === 1) return `${XML_DECL}\n${events[0].xml}\n`
  return `${XML_DECL}\n<events source="SPECTRAL" classification="${xmlEscape(doc.classification)}">\n${events.map((e) => e.xml).join('\n')}\n</events>\n`
}

function zipSafe(uid: string): string {
  return uid.replace(/[^A-Za-z0-9._-]+/g, '_')
}

/** MissionPackage manifest (version 2) listing each .cot entry. */
export function buildDataPackageManifest(doc: ExportDocument, packageUid: string, entries: Array<{ uid: string; path: string }>): string {
  const contents = entries
    .map((e) => `<Content ignore="false" zipEntry="${xmlEscape(e.path)}"><Parameter name="uid" value="${xmlEscape(e.uid)}"/></Content>`)
    .join('\n    ')
  return [
    XML_DECL,
    '<MissionPackageManifest version="2">',
    '  <Configuration>',
    `    <Parameter name="uid" value="${xmlEscape(packageUid)}"/>`,
    `    <Parameter name="name" value="${xmlEscape(`SPECTRAL ${doc.title}`)}"/>`,
    '    <Parameter name="onReceiveDelete" value="false"/>',
    '  </Configuration>',
    '  <Contents>',
    `    ${contents}`,
    '  </Contents>',
    '</MissionPackageManifest>',
    '',
  ].join('\n')
}

/** ATAK / WinTAK data package: one .cot per event plus MANIFEST/manifest.xml. */
export function buildAtakDataPackage(doc: ExportDocument, now = new Date(doc.generatedAt), opts: CotOptions = {}): Uint8Array {
  const events = buildCotEvents(doc, now, opts)
  const packageUid = `SPECTRAL-${exportSlug(doc.title)}-${exportStamp(now)}`
  const files: Array<{ path: string; data: string }> = []
  const entries: Array<{ uid: string; path: string }> = []
  for (const e of events) {
    const dir = zipSafe(e.uid)
    const path = `${dir}/${dir}.cot`
    files.push({ path, data: `${XML_DECL}\n${e.xml}\n` })
    entries.push({ uid: e.uid, path })
  }
  files.push({ path: 'MANIFEST/manifest.xml', data: buildDataPackageManifest(doc, packageUid, entries) })
  return buildStoreZip(files, now)
}
