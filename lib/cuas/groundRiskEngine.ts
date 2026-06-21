// SPECTRAL — ground risk near C-UAS laydown (training)
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import type { GradedClaim } from '@/lib/gnss/types'

export interface GroundRiskInput {
  cuas_name: string
  defeat_range_m: number
  nearest_civilian_structure_m: number | null
  rf_jamming_capable: boolean
  population_tier: 'remote' | 'rural' | 'suburban' | 'urban' | 'dense_urban'
}

export interface GroundRiskAssessment {
  overall: GradedClaim<'low' | 'medium' | 'high'>
  kinetic_flyout: GradedClaim<boolean>
  rf_hazard: GradedClaim<boolean>
  summary: string
}

export class GroundRiskEngine {
  assess(input: GroundRiskInput): GroundRiskAssessment {
    const kinetic =
      input.nearest_civilian_structure_m != null &&
      input.nearest_civilian_structure_m < input.defeat_range_m * 0.15

    const rf =
      input.rf_jamming_capable &&
      (input.population_tier === 'urban' || input.population_tier === 'dense_urban')

    let level: 'low' | 'medium' | 'high' = 'low'
    if (kinetic && rf) level = 'high'
    else if (kinetic || rf) level = 'medium'

    const grade = (value: boolean): GradedClaim<boolean> => ({
      value,
      grade: value ? 'inferred' : 'confirmed',
      basis: value
        ? 'Derived from OSINT laydown geometry and defeat method flags (training).'
        : 'No assessed hazard flag for this dimension.',
      source_ref: null,
    })

    return {
      overall: {
        value: level,
        grade: level === 'low' ? 'confirmed' : 'inferred',
        basis: `${input.cuas_name} — ground risk tier for Map Intel training.`,
        source_ref: null,
      },
      kinetic_flyout: grade(kinetic),
      rf_hazard: grade(rf),
      summary:
        level === 'high'
          ? 'Review siting — kinetic debris and RF spillover may affect civilian receivers.'
          : level === 'medium'
            ? 'Monitor proximity to structures / GNSS-dependent systems during jamming TTPs.'
            : 'Ground risk within training thresholds for current laydown.',
    }
  }
}
