/**
 * KML 2.2 writer for the Map Intel laydown.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Folders by force (Blue, Red, Neutral) holding asset placemarks, range rings as
 * polygons and planned mission paths as LineStrings, plus spectrum conflicts
 * when the fratricide check has run. Styled by side.
 */
import { circleRing, xmlEscape, type ExportDocument, type ExportItem } from './model'

/** KML colours are aabbggrr. */
function kmlColor(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = h.slice(0, 2)
  const g = h.slice(2, 4)
  const b = h.slice(4, 6)
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${a}${b}${g}${r}`.toLowerCase()
}

const SIDE_HEX: Record<ExportItem['side'], string> = { blue: '#2997FF', red: '#FF5C6E', neutral: '#FBBF24' }
const SEV_HEX = { high: '#FF5C6E', medium: '#FBBF24', low: '#FCD34D' } as const

function coord(lon: number, lat: number, alt = 0): string {
  return `${lon.toFixed(6)},${lat.toFixed(6)},${alt.toFixed(1)}`
}

function styles(): string {
  const out: string[] = []
  for (const side of ['blue', 'red', 'neutral'] as const) {
    const hex = SIDE_HEX[side]
    out.push(
      `<Style id="${side}-point"><IconStyle><color>${kmlColor(hex, 1)}</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle><LabelStyle><scale>0.9</scale></LabelStyle></Style>`,
      `<Style id="${side}-ring"><LineStyle><color>${kmlColor(hex, 0.9)}</color><width>2</width></LineStyle><PolyStyle><color>${kmlColor(hex, 0.12)}</color></PolyStyle></Style>`,
      `<Style id="${side}-path"><LineStyle><color>${kmlColor(hex, 1)}</color><width>3</width></LineStyle></Style>`,
    )
  }
  for (const sev of ['high', 'medium', 'low'] as const) {
    out.push(`<Style id="conflict-${sev}"><LineStyle><color>${kmlColor(SEV_HEX[sev], 1)}</color><width>6</width></LineStyle></Style>`)
  }
  return out.join('\n')
}

function data(name: string, value: string | number | null): string {
  return `<Data name="${xmlEscape(name)}"><value>${xmlEscape(value == null ? '' : String(value))}</value></Data>`
}

function extended(item: ExportItem): string {
  return `<ExtendedData>${[
    data('uid', item.uid),
    data('side', item.side),
    data('kind', item.kind),
    data('type', item.cotType),
    data('system', item.name),
    data('role', item.role),
    data('range_m', item.range_m),
    data('band', item.bands.join('; ')),
    data('source', item.source),
    data('confidence', item.confidence),
  ].join('')}</ExtendedData>`
}

function description(item: ExportItem): string {
  const lines = [
    `${item.name}`,
    `Role: ${item.role}`,
    item.range_m ? `${item.range_kind ?? 'range'} range: ${item.range_m} m` : '',
    item.bands.length ? `Bands: ${item.bands.join('; ')}` : '',
    `Source: ${item.source} (${item.confidence})`,
  ].filter(Boolean)
  return xmlEscape(lines.join('\n'))
}

function placemark(item: ExportItem): string {
  return `<Placemark id="${xmlEscape(item.uid)}"><name>${xmlEscape(item.callsign)}</name><description>${description(item)}</description><styleUrl>#${item.side}-point</styleUrl>${extended(item)}<Point><altitudeMode>absolute</altitudeMode><coordinates>${coord(item.lon, item.lat, item.alt_m)}</coordinates></Point></Placemark>`
}

function ring(item: ExportItem): string {
  if (!item.range_m) return ''
  const pts = circleRing(item.lon, item.lat, item.range_m)
    .map(([lon, lat]) => coord(lon, lat))
    .join(' ')
  return `<Placemark id="${xmlEscape(`${item.uid}-ring`)}"><name>${xmlEscape(`${item.callsign} ${item.range_kind ?? 'range'} ring`)}</name><description>${xmlEscape(`${item.range_m} m`)}</description><styleUrl>#${item.side}-ring</styleUrl>${extended(item)}<Polygon><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><outerBoundaryIs><LinearRing><coordinates>${pts}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`
}

function path(item: ExportItem): string {
  if (!item.path || item.path.length < 2) return ''
  const pts = item.path.map((p) => coord(p.lon, p.lat, p.alt_m)).join(' ')
  return `<Placemark id="${xmlEscape(`${item.uid}-route`)}"><name>${xmlEscape(`${item.callsign} route`)}</name><styleUrl>#${item.side}-path</styleUrl>${extended(item)}<LineString><tessellate>1</tessellate><altitudeMode>absolute</altitudeMode><coordinates>${pts}</coordinates></LineString></Placemark>`
}

export function buildKml(doc: ExportDocument): string {
  const folders: string[] = []
  const sides: Array<{ side: ExportItem['side']; name: string }> = [
    { side: 'blue', name: 'Blue force' },
    { side: 'red', name: 'Red force' },
    { side: 'neutral', name: 'Neutral' },
  ]
  for (const { side, name } of sides) {
    const items = doc.items.filter((i) => i.side === side)
    if (items.length === 0) continue
    folders.push(
      `<Folder><name>${name}</name>` +
        `<Folder><name>Assets</name>${items.map(placemark).join('')}</Folder>` +
        `<Folder><name>Range rings</name><visibility>1</visibility>${items.map(ring).join('')}</Folder>` +
        `<Folder><name>Mission paths</name>${items.map(path).join('')}</Folder>` +
        `</Folder>`,
    )
  }
  if (doc.conflicts.length > 0) {
    const marks = doc.conflicts
      .map((c) => {
        const pts = (c.path.length === 1 ? [c.path[0], c.path[0]] : c.path).map((p) => coord(p.lon, p.lat, p.alt_m)).join(' ')
        return `<Placemark id="${xmlEscape(c.id)}"><name>${xmlEscape(`${c.kind === 'fratricide' ? 'Fratricide' : 'Enemy EW'}: ${c.severity}`)}</name><description>${xmlEscape(c.summary)}</description><styleUrl>#conflict-${c.severity}</styleUrl><LineString><altitudeMode>absolute</altitudeMode><coordinates>${pts}</coordinates></LineString></Placemark>`
      })
      .join('')
    folders.push(`<Folder><name>Spectrum conflicts</name>${marks}</Folder>`)
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '<Document>',
    `<name>${xmlEscape(`SPECTRAL ${doc.title}`)}</name>`,
    `<description>${xmlEscape(`${doc.classification}. OSINT planning laydown generated ${doc.generatedAt}. Heights AMSL. Positions are planning positions, not tracks.`)}</description>`,
    styles(),
    ...folders,
    '</Document>',
    '</kml>',
    '',
  ].join('\n')
}
