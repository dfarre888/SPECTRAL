// SPECTRAL — spectrum deconfliction (friendly vs adversary EW)
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import { haversineM } from '@/lib/propagation/geo'
import type { GnssBand } from '@/lib/gnss/types'
import { EwPropagationEngine } from './ewPropagationEngine'

export const EW_ADVERSARY_EFFECTIVENESS_REF = 'SOVEREIGN_CORE_BOUNDARY' as const

export interface EwEmitterInput {
  id: string
  name: string
  side: 'friendly' | 'adversary'
  lon: number
  lat: number
  band: GnssBand
  erp_watts: number
}

export interface DeconflictionAnalysis {
  adversary_effectiveness_ref: typeof EW_ADVERSARY_EFFECTIVENESS_REF
  verdict: 'clear' | 'contested' | 'self_jam_risk'
  overlapping_pairs: Array<{
    friendly_id: string
    adversary_id: string
    separation_m: number
    band: GnssBand
    note: string
  }>
  friendly_self_overlap: Array<{ a_id: string; b_id: string; band: GnssBand; separation_m: number }>
  summary: string
}

export class SpectrumDeconflictionEngine {
  private propagation = new EwPropagationEngine()

  analyseDeconfliction(emitters: EwEmitterInput[]): DeconflictionAnalysis {
    const friendly = emitters.filter((e) => e.side === 'friendly')
    const adversary = emitters.filter((e) => e.side === 'adversary')
    const overlapping_pairs: DeconflictionAnalysis['overlapping_pairs'] = []
    const friendly_self_overlap: DeconflictionAnalysis['friendly_self_overlap'] = []

    for (const f of friendly) {
      const fRadius = this.propagation.computeFootprint({ band: f.band, erp_watts: f.erp_watts }).effective_radius_m
      for (const a of adversary) {
        if (f.band !== a.band) continue
        const sep = haversineM(f.lat, f.lon, a.lat, a.lon)
        const aRadius = this.propagation.computeFootprint({ band: a.band, erp_watts: a.erp_watts }).effective_radius_m
        if (sep < fRadius + aRadius) {
          overlapping_pairs.push({
            friendly_id: f.id,
            adversary_id: a.id,
            separation_m: Math.round(sep),
            band: f.band,
            note: 'Co-band footprint overlap — assess fratricide / collateral GNSS denial.',
          })
        }
      }
    }

    for (let i = 0; i < friendly.length; i++) {
      for (let j = i + 1; j < friendly.length; j++) {
        const a = friendly[i]
        const b = friendly[j]
        if (a.band !== b.band) continue
        const sep = haversineM(a.lat, a.lon, b.lat, b.lon)
        const rA = this.propagation.computeFootprint({ band: a.band, erp_watts: a.erp_watts }).effective_radius_m
        const rB = this.propagation.computeFootprint({ band: b.band, erp_watts: b.erp_watts }).effective_radius_m
        if (sep < rA + rB) {
          friendly_self_overlap.push({ a_id: a.id, b_id: b.id, band: a.band, separation_m: Math.round(sep) })
        }
      }
    }

    let verdict: DeconflictionAnalysis['verdict'] = 'clear'
    if (friendly_self_overlap.length > 0) verdict = 'self_jam_risk'
    else if (overlapping_pairs.length > 0) verdict = 'contested'

    const summary =
      verdict === 'clear'
        ? 'No co-band footprint overlap detected at current ERP assumptions.'
        : verdict === 'contested'
          ? 'Friendly and adversary EW footprints overlap — deconflict power, time, or geometry.'
          : 'Friendly emitters on the same band overlap — risk of self-jam / GNSS denial to blue force.'

    return {
      adversary_effectiveness_ref: EW_ADVERSARY_EFFECTIVENESS_REF,
      verdict,
      overlapping_pairs,
      friendly_self_overlap,
      summary,
    }
  }
}
