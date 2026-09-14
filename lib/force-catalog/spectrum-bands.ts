/**
 * Sensing band vocabulary and per-band fill for the spectrum ribbon.
 * Ordered RF low→high, then IR long→short wave, then visible and UV.
 */
import type { FreqBand, PlatformSensor } from '@/lib/bmi/bmi-types'

export type SensorBand = FreqBand | 'IR' | 'VIS' | 'NIR' | 'SWIR' | 'MWIR' | 'LWIR' | 'UV' | 'laser'

export const SENSING_BANDS: SensorBand[] = [
  'HF', 'VHF', 'UHF', 'L', 'S', 'C', 'X', 'Ku', 'Ka',
  'LWIR', 'MWIR', 'SWIR', 'NIR', 'VIS', 'UV', 'laser',
]

export const BAND_KIND: Record<SensorBand, 'rf' | 'ir' | 'optical'> = {
  HF: 'rf', VHF: 'rf', UHF: 'rf', L: 'rf', S: 'rf', C: 'rf', X: 'rf', Ku: 'rf', Ka: 'rf',
  IR: 'ir', LWIR: 'ir', MWIR: 'ir', SWIR: 'ir',
  NIR: 'optical', VIS: 'optical', UV: 'optical', laser: 'optical',
}

/** `bands[]` wins; fall back to the legacy single `band`. Unknown bands are kept verbatim. */
export function sensorBands(s: Pick<PlatformSensor, 'band' | 'bands'>): SensorBand[] {
  if (s.bands && s.bands.length) return s.bands as SensorBand[]
  return s.band ? [s.band as SensorBand] : []
}

export type SensorsStatus = 'listed' | 'gap'

export function sensorsStatus(p: { sensors: unknown[] }): SensorsStatus {
  return Array.isArray(p.sensors) && p.sensors.length > 0 ? 'listed' : 'gap'
}

export interface BandFill {
  band: SensorBand
  active: number
  total: number
}

/**
 * Distinct platforms per sensing band. `total` counts every platform in scope,
 * `active` excludes benched ones. Generic `IR` is folded into MWIR/LWIR/SWIR
 * only when the sensor says so; otherwise it stays out of the ribbon.
 */
export function bandFill(
  platforms: { id: string; sensors: Pick<PlatformSensor, 'band' | 'bands'>[] }[],
  benched: Set<string>,
): BandFill[] {
  const total = new Map<SensorBand, Set<string>>()
  const active = new Map<SensorBand, Set<string>>()
  for (const b of SENSING_BANDS) {
    total.set(b, new Set())
    active.set(b, new Set())
  }
  for (const p of platforms) {
    for (const s of p.sensors) {
      for (const b of sensorBands(s)) {
        if (!total.has(b)) continue
        total.get(b)!.add(p.id)
        if (!benched.has(p.id)) active.get(b)!.add(p.id)
      }
    }
  }
  return SENSING_BANDS.map((band) => ({
    band,
    active: active.get(band)!.size,
    total: total.get(band)!.size,
  }))
}
