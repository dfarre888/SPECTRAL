/**
 * Map Intel exports to the tactical picture: CoT (TAK, LAND 156 Cortex and
 * other CoT consumers), ATAK data package, KML and GeoJSON.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { buildAtakDataPackage, buildCotFile } from './cot'
import { buildGeoJson } from './geojson'
import { buildKml } from './kml'
import { exportSlug, exportStamp, type ExportDocument } from './model'

export * from './model'
export * from './cot'
export * from './kml'
export * from './geojson'
export { buildStoreZip, readStoreZip, crc32 } from './zip'

export type ExportFormat = 'cot' | 'atak' | 'kml' | 'geojson'

export const EXPORT_FORMATS: Array<{ id: ExportFormat; label: string; ext: string; note: string }> = [
  { id: 'cot', label: 'CoT events', ext: 'cot', note: 'Cursor-on-Target XML for TAK Server, CoT gateways and C2 such as LAND 156 Cortex.' },
  { id: 'atak', label: 'ATAK data package', ext: 'zip', note: 'Import into ATAK or WinTAK in one step: units, range rings and routes.' },
  { id: 'kml', label: 'KML', ext: 'kml', note: 'Google Earth, ArcGIS and most map viewers. Folders by force.' },
  { id: 'geojson', label: 'GeoJSON', ext: 'geojson', note: 'GIS tools and web maps. One feature per asset, ring and path.' },
]

export interface ExportFile {
  filename: string
  mime: string
  data: string | Uint8Array
}

export function renderExport(format: ExportFormat, doc: ExportDocument): ExportFile {
  const now = new Date(doc.generatedAt)
  const base = `spectral-${exportSlug(doc.title)}-${exportStamp(now)}`
  switch (format) {
    case 'cot':
      return { filename: `${base}.cot`, mime: 'application/xml', data: buildCotFile(doc, now) }
    case 'atak':
      return { filename: `${base}-atak.zip`, mime: 'application/zip', data: buildAtakDataPackage(doc, now) }
    case 'kml':
      return { filename: `${base}.kml`, mime: 'application/vnd.google-earth.kml+xml', data: buildKml(doc) }
    case 'geojson':
      return { filename: `${base}.geojson`, mime: 'application/geo+json', data: JSON.stringify(buildGeoJson(doc), null, 2) }
  }
}
