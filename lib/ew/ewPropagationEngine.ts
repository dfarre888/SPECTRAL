// SPECTRAL — EW propagation (training FSPL + J/S effect)
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import { BAND_REFERENCE, type GnssBand } from '@/lib/gnss/types'

const C_M_S = 299_792_458

export interface EwFootprintInput {
  band: GnssBand
  erp_watts: number
  receiver_sensitivity_dbm?: number
  js_threshold_db?: number
}

export interface RangeEffectPoint {
  range_m: number
  js_db: number
  effect_pct: number
}

export interface EwFootprintResult {
  band: GnssBand
  band_label: string
  centre_mhz: number | null
  erp_dbm: number
  effective_radius_m: number
  curve: RangeEffectPoint[]
}

export class EwPropagationEngine {
  fsplDb(distance_m: number, freq_hz: number): number {
    const d = Math.max(distance_m, 1)
    const f = Math.max(freq_hz, 1)
    return 20 * Math.log10(d) + 20 * Math.log10(f) + 20 * Math.log10(4 * Math.PI / C_M_S)
  }

  jsRatioToEffectPct(js_db: number, threshold_db = 10): number {
    const x = js_db - threshold_db
    const pct = 100 / (1 + Math.exp(-0.35 * x))
    return parseFloat(Math.min(100, Math.max(0, pct)).toFixed(1))
  }

  centreHzForBand(band: GnssBand): number {
    const mhz = BAND_REFERENCE[band]?.centre_mhz
    if (mhz == null) return 1575.42e6
    return mhz * 1e6
  }

  computeEffectByRange(input: EwFootprintInput, max_range_m: number, steps = 20): RangeEffectPoint[] {
    const freq_hz = this.centreHzForBand(input.band)
    const erp_dbm = 10 * Math.log10(Math.max(input.erp_watts, 0.001) * 1000)
    const sens = input.receiver_sensitivity_dbm ?? (freq_hz < 2e9 ? -130 : -100)
    const threshold = input.js_threshold_db ?? 10
    const curve: RangeEffectPoint[] = []
    for (let i = 1; i <= steps; i++) {
      const range_m = (max_range_m * i) / steps
      const fspl = this.fsplDb(range_m, freq_hz)
      const jam_dbm = erp_dbm - fspl
      const js_db = jam_dbm - sens
      curve.push({
        range_m: Math.round(range_m),
        js_db: parseFloat(js_db.toFixed(2)),
        effect_pct: this.jsRatioToEffectPct(js_db, threshold),
      })
    }
    return curve
  }

  computeFootprint(input: EwFootprintInput): EwFootprintResult {
    const freq_hz = this.centreHzForBand(input.band)
    const erp_dbm = 10 * Math.log10(Math.max(input.erp_watts, 0.001) * 1000)
    const sens = input.receiver_sensitivity_dbm ?? (freq_hz < 2e9 ? -130 : -100)
    const threshold = input.js_threshold_db ?? 10

    let lo = 10
    let hi = Math.min(500_000, 15_000 + Math.sqrt(Math.max(input.erp_watts, 1)) * 25_000)
    while (hi - lo > 25) {
      const mid = (lo + hi) / 2
      const js = erp_dbm - this.fsplDb(mid, freq_hz) - sens
      if (this.jsRatioToEffectPct(js, threshold) >= 50) lo = mid
      else hi = mid
    }

    const effective_radius_m = Math.round((lo + hi) / 2)
    const curve = this.computeEffectByRange(input, effective_radius_m * 1.25, 24)

    return {
      band: input.band,
      band_label: BAND_REFERENCE[input.band]?.label ?? input.band,
      centre_mhz: BAND_REFERENCE[input.band]?.centre_mhz ?? null,
      erp_dbm: parseFloat(erp_dbm.toFixed(2)),
      effective_radius_m,
      curve,
    }
  }
}
