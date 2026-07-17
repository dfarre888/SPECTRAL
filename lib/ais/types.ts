/**
 * AIS Marine Traffic — normalised types for SPECTRAL
 *
 * Provider-agnostic representation. The server route at
 * /api/ais/vessels normalises raw API responses into this shape.
 */

/** Normalised AIS vessel record */
export interface AisVessel {
  /** Maritime Mobile Service Identity (unique vessel ID) */
  mmsi: string
  /** Vessel name (may be empty for some records) */
  name: string
  lat: number
  lon: number
  /** Speed over ground — knots */
  sog: number
  /** Course over ground — degrees true */
  cog: number
  /** AIS vessel type code 0–99 (https://api.marinetraffic.com/en/it/vessel_types) */
  type: number
  /** Flag state ISO 2-letter country code */
  flag?: string
  /** ISO timestamp of last position report */
  timestamp?: string
  /** Vessel draught in metres (if provided by API) */
  draught?: number
  /** IMO number */
  imo?: string
}

/** Bounding box sent to /api/ais/vessels */
export interface AisBbox {
  minLon: number
  maxLon: number
  minLat: number
  maxLat: number
}

/** Default AIS query extent — global coverage [[-90,-180],[90,180]] */
export const AIS_DEFAULT_BBOX: AisBbox = {
  minLat: -90,
  minLon: -180,
  maxLat: 90,
  maxLon: 180,
}

export function aisBboxSearchParams(bbox: AisBbox = AIS_DEFAULT_BBOX): URLSearchParams {
  return new URLSearchParams({
    minLat: String(bbox.minLat),
    maxLat: String(bbox.maxLat),
    minLon: String(bbox.minLon),
    maxLon: String(bbox.maxLon),
  })
}

// ── AIS type-code helpers ─────────────────────────────────────────────────────

/** Human-readable label for an AIS vessel type code */
export function aisTypeLabel(typeCode: number): string {
  if (typeCode === 0)                          return 'Unknown'
  if (typeCode >= 20 && typeCode <= 29)        return 'WIG'
  if (typeCode >= 30 && typeCode <= 39)        return 'Fishing'
  if (typeCode >= 40 && typeCode <= 49)        return 'HSC'
  if (typeCode === 50)                         return 'Pilot'
  if (typeCode === 51)                         return 'SAR'
  if (typeCode === 52)                         return 'Tug'
  if (typeCode === 53)                         return 'Port Tender'
  if (typeCode === 55)                         return 'Law Enforcement'
  if (typeCode === 56 || typeCode === 57)      return 'Spare'
  if (typeCode === 58)                         return 'Medical'
  if (typeCode === 59)                         return 'Noncombatant'
  if (typeCode >= 60 && typeCode <= 69)        return 'Passenger'
  if (typeCode >= 70 && typeCode <= 79)        return 'Cargo'
  if (typeCode >= 80 && typeCode <= 89)        return 'Tanker'
  if (typeCode >= 90 && typeCode <= 99)        return 'Other'
  return 'Unknown'
}

/** Returns the SPECTRAL COP colour for a vessel type */
export function aisTypeColor(typeCode: number): string {
  if (typeCode >= 35 && typeCode <= 39)        return '#EF4444' // naval / military
  if (typeCode >= 80 && typeCode <= 89)        return '#F97316' // tanker — orange
  if (typeCode >= 70 && typeCode <= 79)        return '#06B6D4' // cargo — cyan
  if (typeCode >= 60 && typeCode <= 69)        return '#A855F7' // passenger — purple
  if (typeCode === 51 || typeCode === 58)      return '#22C55E' // SAR / medical — green
  return '#06B6D4'                                              // default cyan
}

/** Normalise a raw MarineTraffic REST API vessel record into AisVessel */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normaliseMarineTraffic(raw: Record<string, any>): AisVessel {
  return {
    mmsi:      String(raw.MMSI      ?? raw.mmsi      ?? ''),
    name:      String(raw.SHIPNAME  ?? raw.name      ?? raw.NAME ?? '').trim(),
    lat:       Number(raw.LAT       ?? raw.lat        ?? 0),
    lon:       Number(raw.LON       ?? raw.lon        ?? 0),
    sog:       Number(raw.SPEED     ?? raw.sog        ?? 0),
    cog:       Number(raw.COURSE    ?? raw.cog        ?? 0),
    type:      Number(raw.SHIPTYPE  ?? raw.type       ?? 0),
    flag:      String(raw.FLAG      ?? raw.flag       ?? ''),
    timestamp: String(raw.TIMESTAMP ?? raw.timestamp  ?? ''),
    draught:   raw.DRAUGHT  != null ? Number(raw.DRAUGHT)  : undefined,
    imo:       raw.IMO      != null ? String(raw.IMO)       : undefined,
  }
}
