/** Display order and labels for GNSS Intelligence constellation views. */

export const GNSS_CONSTELLATION_ORDER = [
  'gps',
  'glonass',
  'galileo',
  'beidou',
  'navic',
  'qzss',
  'sbas',
  'starlink',
] as const

export type GnssConstellationId = (typeof GNSS_CONSTELLATION_ORDER)[number]

export const GNSS_CONSTELLATION_LABELS: Record<string, string> = {
  gps: 'GPS',
  glonass: 'GLONASS',
  galileo: 'Galileo',
  beidou: 'BeiDou',
  navic: 'NavIC',
  qzss: 'QZSS',
  sbas: 'SBAS',
  starlink: 'Starlink',
}

export const LEO_COMMS_IDS = new Set<string>(['starlink'])

export function sortConstellations<T extends { id: string }>(items: T[]): T[] {
  const order = new Map<string, number>(GNSS_CONSTELLATION_ORDER.map((id, i) => [id, i]))
  return [...items].sort((a, b) => {
    const ai = order.get(a.id) ?? 99
    const bi = order.get(b.id) ?? 99
    if (ai !== bi) return ai - bi
    return a.id.localeCompare(b.id)
  })
}

export function formatSignalFreqMhz(mhz: number): string {
  if (mhz >= 10_000) return `${(mhz / 1000).toFixed(2)} GHz`
  return `${mhz.toFixed(2)} MHz`
}
