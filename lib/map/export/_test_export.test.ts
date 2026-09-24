import { describe, expect, it } from 'vitest'
import {
  argbInt,
  buildAtakDataPackage,
  buildCotEvents,
  buildCotFile,
  buildExportDocument,
  buildGeoJson,
  buildKml,
  circleRing,
  cotTypeFor,
  EXPORT_CLASSIFICATION,
  exportStamp,
  readStoreZip,
  renderExport,
  validateLaydownGeoJson,
  xmlEscape,
} from '@/lib/map/export'
import { allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import { toMapCuasAsset, toMapUasAsset } from '@/lib/map/asset-mappers'
import { getSpectraMapAssets } from '@/lib/map/spectra-assets'
import { buildPresetLaydown } from '@/lib/map/laydown-presets'
import { runLaydownFratricide } from '@/lib/map/fratricide-adapter'
import { OFFLINE_DEFEAT_SYSTEMS } from '@/lib/pcm/defeat-matrix-offline-data'
import type { MapAssetsPayload } from '@/lib/map/types'

/** Strict enough XML well-formedness check: balanced tags, quoted attributes, legal entities. */
function checkXml(xml: string): string[] {
  const errs: string[] = []
  const stack: string[] = []
  let i = 0
  let roots = 0
  const text = (t: string) => {
    const bad = t.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/)
    if (bad) errs.push(`bad entity near ${t.slice(0, 30)}`)
    if (/[<]/.test(t)) errs.push('stray <')
  }
  while (i < xml.length) {
    const lt = xml.indexOf('<', i)
    if (lt < 0) {
      text(xml.slice(i))
      break
    }
    text(xml.slice(i, lt))
    if (xml.startsWith('<?', lt)) {
      const end = xml.indexOf('?>', lt)
      if (end < 0) return [...errs, 'unclosed declaration']
      i = end + 2
      continue
    }
    if (xml.startsWith('<!--', lt)) {
      i = xml.indexOf('-->', lt) + 3
      continue
    }
    const gt = xml.indexOf('>', lt)
    if (gt < 0) return [...errs, 'unclosed tag']
    const raw = xml.slice(lt + 1, gt)
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim()
      const open = stack.pop()
      if (open !== name) errs.push(`mismatched </${name}> (open ${open})`)
    } else {
      const selfClose = raw.endsWith('/')
      const body = selfClose ? raw.slice(0, -1) : raw
      const m = body.match(/^([A-Za-z_][\w.:-]*)([\s\S]*)$/)
      if (!m) {
        errs.push(`bad tag <${raw.slice(0, 20)}>`)
      } else {
        const attrs = m[2].trim()
        const attrRe = /^([A-Za-z_][\w.:-]*)="([^"<]*)"\s*/
        let rest = attrs
        const seen = new Set<string>()
        while (rest.length) {
          const a = rest.match(attrRe)
          if (!a) {
            errs.push(`bad attribute in <${m[1]}>: ${rest.slice(0, 30)}`)
            break
          }
          if (seen.has(a[1])) errs.push(`duplicate attribute ${a[1]}`)
          seen.add(a[1])
          text(a[2])
          rest = rest.slice(a[0].length)
        }
        if (stack.length === 0) roots++
        if (!selfClose) stack.push(m[1])
      }
    }
    i = gt + 1
  }
  if (stack.length) errs.push(`unclosed: ${stack.join(',')}`)
  if (roots !== 1) errs.push(`expected one root element, found ${roots}`)
  return errs
}

function offlineCatalog(): MapAssetsPayload {
  const s = getSpectraMapAssets()
  return {
    uas: allA3dmPlatforms().map(toMapUasAsset),
    cuas: OFFLINE_DEFEAT_SYSTEMS.map(toMapCuasAsset),
    radars: s.radars,
    effectors: s.effectors,
  }
}

function presetDoc() {
  const p = buildPresetLaydown('combat-team', offlineCatalog())
  const report = runLaydownFratricide(p.placedUas, p.placedCuas)
  return buildExportDocument({
    title: p.name,
    placedUas: p.placedUas,
    placedCuas: p.placedCuas,
    placedRadars: p.placedRadars,
    placedEffectors: p.placedEffectors,
    conflicts: report.conflicts,
    now: new Date('2026-09-24T03:12:45Z'),
  })
}

describe('export model', () => {
  it('assigns CoT types by kind and affiliation', () => {
    expect(cotTypeFor('uas', 'friendly')).toBe('a-f-A-M-F-Q')
    expect(cotTypeFor('uas', 'hostile')).toBe('a-h-A-M-F-Q')
    expect(cotTypeFor('cuas', 'friendly')).toBe('a-f-G-E-W')
    expect(cotTypeFor('cuas', 'hostile')).toBe('a-h-G-E-W')
    expect(cotTypeFor('cuas', 'friendly', { passive: true })).toBe('a-f-G-E-S')
    expect(cotTypeFor('radar', 'friendly')).toBe('a-f-G-E-S-R')
    expect(cotTypeFor('effector', 'friendly', { missile: true })).toBe('a-f-G-E-W-M-A')
  })

  it('normalises the combat team preset with sides, bands and paths', () => {
    const doc = presetDoc()
    expect(doc.classification).toBe(EXPORT_CLASSIFICATION)
    const blueFpv = doc.items.find((i) => i.callsign === 'FPV A1')!
    expect(blueFpv.cotType).toBe('a-f-A-M-F-Q')
    expect(blueFpv.path?.length).toBeGreaterThanOrEqual(2)
    expect(blueFpv.bands.length).toBeGreaterThan(0)
    const redJam = doc.items.find((i) => i.kind === 'cuas' && i.side === 'red')!
    expect(redJam.cotType).toBe('a-h-G-E-W')
    const detector = doc.items.find((i) => /RfPatrol/.test(i.callsign))!
    expect(detector.cotType).toBe('a-f-G-E-S')
    expect(detector.callsign).toMatch(/assumed specs/)
    expect(doc.conflicts.length).toBeGreaterThan(0)
  })

  it('escapes XML metacharacters and strips control characters', () => {
    expect(xmlEscape(`a<b>&"c'\u0001`)).toBe('a&lt;b&gt;&amp;&quot;c&apos;')
  })

  it('stamps files in UTC', () => {
    expect(exportStamp(new Date('2026-09-24T03:12:45.123Z'))).toBe('20260924T0312Z')
  })

  it('draws counter-clockwise closed rings of the right radius', () => {
    const ring = circleRing(150.4, -22.6, 2000, 32)
    expect(ring[0]).toEqual(ring[ring.length - 1])
    let area = 0
    for (let k = 0; k < ring.length - 1; k++) area += ring[k][0] * ring[k + 1][1] - ring[k + 1][0] * ring[k][1]
    expect(area).toBeGreaterThan(0)
    const dLat = Math.abs(ring[0][1] - -22.6) * 111_195
    expect(dLat).toBeGreaterThan(1990)
    expect(dLat).toBeLessThan(2010)
  })
})

describe('CoT', () => {
  const doc = presetDoc()
  const now = new Date(doc.generatedAt)

  it('writes one well-formed event per asset with contact, remarks and a 24 h stale time', () => {
    const events = buildCotEvents(doc, now)
    const assets = events.filter((e) => !/-ring$|-route$/.test(e.uid))
    expect(assets).toHaveLength(doc.items.length)
    for (const e of events) expect(checkXml(e.xml)).toEqual([])
    const fpv = events.find((e) => e.uid === 'SPECTRAL-ts27-blue-fpv-a1')!.xml
    expect(fpv).toMatch(/type="a-f-A-M-F-Q"/)
    expect(fpv).toMatch(/how="h-e"/)
    expect(fpv).toMatch(/<point lat="-22\.\d+" lon="150\.\d+" hae="[\d.]+" ce="50\.0" le="50\.0"\/>/)
    expect(fpv).toMatch(/<contact callsign="FPV A1"\/>/)
    expect(fpv).toMatch(/<remarks source="SPECTRAL">UNCLASSIFIED \/\/ FOR OFFICIAL TRAINING USE ONLY\./)
    expect(fpv).toMatch(/stale="2026-09-25T03:12:45\.000Z"/)
  })

  it('includes range rings (u-d-c-c) and routes (b-m-r)', () => {
    const events = buildCotEvents(doc, now)
    expect(events.some((e) => /type="u-d-c-c"/.test(e.xml) && /<ellipse major="\d+"/.test(e.xml))).toBe(true)
    const route = events.find((e) => /type="b-m-r"/.test(e.xml))!
    expect(route.xml).toMatch(/<link uid="[^"]+" type="b-m-p-w" callsign="SP" point="-22\.\d+,150\.\d+,[\d.]+" relation="c"\/>/)
  })

  it('writes a single well-formed .cot document', () => {
    const xml = buildCotFile(doc, now)
    expect(xml.startsWith('<?xml')).toBe(true)
    expect(checkXml(xml)).toEqual([])
  })

  it('packs an ATAK data package with a manifest listing every .cot', () => {
    const zip = buildAtakDataPackage(doc, now)
    const entries = readStoreZip(zip)
    expect(entries.every((e) => e.crcOk)).toBe(true)
    const manifest = entries.find((e) => e.path === 'MANIFEST/manifest.xml')!
    const manifestXml = new TextDecoder().decode(manifest.data)
    expect(checkXml(manifestXml)).toEqual([])
    expect(manifestXml).toMatch(/<MissionPackageManifest version="2">/)
    const cots = entries.filter((e) => e.path.endsWith('.cot'))
    expect(cots.length).toBe(buildCotEvents(doc, now).length)
    for (const c of cots) {
      expect(manifestXml).toContain(`zipEntry="${c.path}"`)
      expect(checkXml(new TextDecoder().decode(c.data))).toEqual([])
    }
  })

  it('stores ATAK colours as signed ARGB integers', () => {
    expect(argbInt(255, 255, 0, 0)).toBe(-65536)
    expect(argbInt(255, 255, 255, 255)).toBe(-1)
  })
})

describe('KML and GeoJSON', () => {
  const doc = presetDoc()

  it('writes well-formed KML with styled placemarks, rings and paths', () => {
    const kml = buildKml(doc)
    expect(checkXml(kml)).toEqual([])
    expect(kml).toMatch(/<kml xmlns="http:\/\/www\.opengis\.net\/kml\/2\.2">/)
    expect(kml).toMatch(/<Folder><name>Blue force<\/name>/)
    expect(kml).toMatch(/<Folder><name>Red force<\/name>/)
    expect(kml).toMatch(/<styleUrl>#blue-ring<\/styleUrl>/)
    expect(kml).toMatch(/<LineString><tessellate>1<\/tessellate><altitudeMode>absolute<\/altitudeMode>/)
    expect(kml).toMatch(/<Folder><name>Spectrum conflicts<\/name>/)
  })

  it('writes a valid GeoJSON FeatureCollection with side, type, range and band properties', () => {
    const fc = buildGeoJson(doc)
    expect(validateLaydownGeoJson(JSON.parse(JSON.stringify(fc)))).toEqual([])
    const asset = fc.features.find((f) => f.id === 'SPECTRAL-ts27-blue-fpv-a1')!
    expect(asset.geometry.type).toBe('Point')
    expect(asset.properties).toMatchObject({ side: 'blue', type: 'a-f-A-M-F-Q', feature: 'asset' })
    expect(typeof asset.properties.band).toBe('string')
    expect(fc.features.some((f) => f.properties.feature === 'range_ring' && f.geometry.type === 'Polygon')).toBe(true)
    expect(fc.features.some((f) => f.properties.feature === 'mission_path')).toBe(true)
    expect(fc.features.some((f) => f.properties.feature === 'spectrum_conflict')).toBe(true)
  })

  it('renders every format to a named file', () => {
    for (const f of ['cot', 'atak', 'kml', 'geojson'] as const) {
      const file = renderExport(f, doc)
      expect(file.filename).toMatch(/^spectral-talisman-sabre-27-combat-team[a-z0-9-]*-20260924T0312Z(-atak)?\.(cot|zip|kml|geojson)$/)
      expect(file.data.length).toBeGreaterThan(200)
    }
  })
})
