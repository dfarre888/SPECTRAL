import { toNatoConfidence } from '@/lib/platforms/confidence'
import { countryFlag } from '@/lib/platforms/flags'
import type { DataConfidence, NatoConfidence, Platform, PlatformCategory } from '@/lib/types'

/**
 * Display helpers shared by the Platform Library table, gallery cards, the
 * dossier page and Platform Compare. Presentation only: nothing here changes
 * a value, it only decides how a value is labelled and formatted.
 */

/** Title-case type labels sized for a table cell. */
export const CATEGORY_TABLE_LABEL: Record<PlatformCategory, string> = {
  MALE: 'MALE',
  HALE: 'HALE',
  tactical: 'Tactical',
  loitering_munition: 'Loitering munition',
  FPV: 'FPV',
  naval: 'Naval',
  VTOL: 'VTOL',
  fixed_wing_tactical: 'Fixed-wing tactical',
  interceptor_uas: 'Interceptor UAS',
  combat_hexacopter: 'Combat hexacopter',
  carrier_uas: 'Carrier UAS',
  tube_launched_lm: 'Tube-launched LM',
  c_uas_gun: 'C-UAS gun',
  c_uas_laser: 'Laser DEW',
  c_uas_rf: 'EW C-UAS',
  manpads: 'MANPADS',
  c_uas_system: 'C-UAS system',
  ballistic_missile_srbm: 'SRBM',
  ballistic_missile_mrbm: 'MRBM',
  cruise_missile: 'Cruise missile',
  hypersonic_missile: 'Hypersonic missile',
  ballistic_missile_slbm: 'SLBM',
  AUV: 'AUV',
  strategic_ew: 'Strategic EW',
  cots: 'COTS',
}

export function categoryLabel(category: PlatformCategory | string): string {
  return CATEGORY_TABLE_LABEL[category as PlatformCategory] ?? String(category).replace(/_/g, ' ')
}

/** Secondary type line: COTS sub-category, else the DoD UAS group. */
export function categoryMeta(p: Platform): string | null {
  if (p.sub_category) return p.sub_category
  if (p.uas_group != null) return `Group ${p.uas_group}`
  return null
}

/** `.tag` colour for each NATO confidence word. */
export const CONFIDENCE_TAG: Record<NatoConfidence, string> = {
  Confirmed: 'green',
  Assessed: 'amber',
  Estimated: '',
  Reported: 'violet',
}

export function confidenceTag(confidence: DataConfidence | null | undefined): {
  label: NatoConfidence
  tone: string
} {
  const label = toNatoConfidence(confidence)
  return { label, tone: CONFIDENCE_TAG[label] }
}

/** Sort rank so Confirmed sorts above Assessed above Estimated. */
export function confidenceRank(confidence: DataConfidence | null | undefined): number {
  switch (confidence) {
    case 'high':
      return 0
    case 'medium':
      return 1
    case 'classified':
      return 2
    default:
      return 3
  }
}

/** Flag emoji only when the country is known; never the white-flag fallback. */
export function knownFlag(country: string | null | undefined): string | null {
  const f = countryFlag(country)
  return f === '🏳️' ? null : f
}

const NUM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const NUM2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** Thousands separators, at most one decimal (two below 1). Null stays null. */
export function fmtNum(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null
  return Math.abs(n) < 1 && n !== 0 ? NUM2.format(n) : NUM.format(n)
}

export function fmtUsd(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null
  return `$${Math.round(n).toLocaleString('en-US')}`
}

/** Guidance strings are stored as snake-ish tokens; show them as words. */
export function guidanceText(p: Platform): string | null {
  const g = p.guidance_type
  if (!g) return null
  return String(g).replace(/_/g, ' ')
}

export function sideLabel(side: Platform['side']): { label: string; tone: 'red' | 'blue' | '' } | null {
  if (side === 'red') return { label: 'Red force', tone: 'red' }
  if (side === 'blue') return { label: 'Blue force', tone: 'blue' }
  return null
}

/** The platform's short secondary identity line: NATO name, then maker. */
export function identityMeta(p: Platform): string | null {
  const parts: string[] = []
  if (p.nato_reporting_name) parts.push(`NATO ${p.nato_reporting_name}`)
  if (p.manufacturer) parts.push(p.manufacturer)
  return parts.length ? parts.join(' · ') : null
}

export function initials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, '')
    .split(/[\s/·-]+/)
    .filter((w) => /[A-Za-z0-9]/.test(w))
  if (words.length >= 2) return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export interface KeyFigure {
  key: string
  label: string
  unit: string
  value: number | null | undefined
}

/** The quantitative figures a platform can carry, in reading order. */
export function keyFigures(p: Platform): KeyFigure[] {
  return [
    { key: 'range', label: 'Range', unit: 'km', value: p.range_km },
    { key: 'speed', label: 'Max speed', unit: 'km/h', value: p.max_speed_kmh },
    { key: 'ceiling', label: 'Service ceiling', unit: 'm', value: p.service_ceiling_m },
    { key: 'endurance', label: 'Endurance', unit: 'h', value: p.endurance_hrs },
    { key: 'mtow', label: 'MTOW', unit: 'kg', value: p.mtow_kg },
    { key: 'warhead', label: 'Warhead', unit: 'kg', value: p.warhead_kg },
    { key: 'payload', label: 'Max payload', unit: 'kg', value: p.max_payload_kg },
    { key: 'terminal', label: 'Terminal speed', unit: 'km/h', value: p.terminal_speed_kmh },
  ]
}

/**
 * The A3DM COTS import stored the Map Intel placement fallback (5 km envelope,
 * 12 m/s, 500 m ceiling, 20 min) in the spec columns of ~250 commercial
 * drones. Those are planning defaults, not published specs, so the library,
 * dossier and Compare show them as unpublished. The map keeps using them.
 */
export function hasEnvelopeFallbackSpecs(p: Pick<Platform, 'range_km' | 'max_speed_kmh' | 'service_ceiling_m' | 'endurance_hrs'>): boolean {
  return (
    Number(p.range_km) === 5 &&
    Number(p.max_speed_kmh) === 43.2 &&
    Number(p.service_ceiling_m) === 500 &&
    Number(p.endurance_hrs) === 0.33
  )
}

/** The platform as it should be read: placeholder performance figures removed. */
export function publishedSpecs<T extends Platform>(p: T): T {
  if (!hasEnvelopeFallbackSpecs(p)) return p
  return { ...p, range_km: null, max_speed_kmh: null, service_ceiling_m: null, endurance_hrs: null }
}
