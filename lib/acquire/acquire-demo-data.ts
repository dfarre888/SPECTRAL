/**
 * OSINT demo fallback for acquire workflow when DB unavailable.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type { DefeatCoverageRow, OrbatPlatformSummary } from '@/lib/acquire/acquire-types'
import type { EconomicsRow } from '@/lib/planner/engagement-economics'
import { BMI_SEED_BUNDLE } from '@/data/seed-bmi-pitchblack2026'

export const DEMO_SHAhed_DEFEAT_COVERAGE: DefeatCoverageRow[] = [
  {
    platform_id: 'shahed-136',
    defeat_system_id: 'gepard-spaag',
    defeat_system_name: 'Gepard SPAAG (AHEAD)',
    kinetic_pct: 82,
    rf_jamming_pct: null,
    dew_pct: null,
    data_confidence: 'estimated',
    is_immune: false,
    special_notes: 'Ukraine OSINT — primary OWA point-defence economics anchor',
  },
  {
    platform_id: 'shahed-136',
    defeat_system_id: 'nasams-amraam-er',
    defeat_system_name: 'NASAMS AMRAAM-ER',
    kinetic_pct: 84,
    rf_jamming_pct: null,
    dew_pct: null,
    data_confidence: 'high',
    is_immune: false,
    special_notes: 'Layered GBAD — unfavourable exchange vs cheap OWA',
  },
  {
    platform_id: 'shahed-136',
    defeat_system_id: 'patriot-pac-3',
    defeat_system_name: 'Patriot PAC-3 MSE',
    kinetic_pct: 75,
    rf_jamming_pct: null,
    dew_pct: null,
    data_confidence: 'estimated',
    is_immune: false,
    special_notes: 'Strategic SAM — reserve for confirmed LACM, not routine OWA',
  },
  {
    platform_id: 'shahed-136',
    defeat_system_id: 'iris-t-sls-cuas',
    defeat_system_name: 'IRIS-T SLS',
    kinetic_pct: 78,
    rf_jamming_pct: null,
    dew_pct: null,
    data_confidence: 'medium',
    is_immune: false,
    special_notes: null,
  },
]

export const DEMO_SHAhed_ECONOMICS: EconomicsRow[] = [
  {
    platformId: 'shahed-136',
    defeatSystemId: 'gepard-spaag',
    unitCostUsd: 40_000,
    threatUnitCostUsd: 20_000,
    magazineRounds: 1000,
    reloadMin: 0.5,
    costConfidence: 'Assessed',
    sourceRef: 'OSINT: RUSI Ukraine 2023 — Gepard AHEAD ~EUR 40k/kill vs Shahed ~$20k',
  },
  {
    platformId: 'shahed-136',
    defeatSystemId: 'nasams-amraam-er',
    unitCostUsd: 1_000_000,
    threatUnitCostUsd: 20_000,
    magazineRounds: 6,
    reloadMin: 15,
    costConfidence: 'Estimated',
    sourceRef: 'OSINT: AMRAAM-ER ~$1M vs Shahed',
  },
  {
    platformId: 'shahed-136',
    defeatSystemId: 'patriot-pac-3',
    unitCostUsd: 4_000_000,
    threatUnitCostUsd: 20_000,
    magazineRounds: 16,
    reloadMin: 30,
    costConfidence: 'Estimated',
    sourceRef: 'OSINT: PAC-3 MSE unit cost ~$4M vs Shahed ~$20k — 200:1 exchange',
  },
]

export function demoDarwinOrbat(): OrbatPlatformSummary[] {
  return BMI_SEED_BUNDLE.platforms
    .filter((p) => p.base_id === 'BASE-DARWIN')
    .map((p) => ({
      id: p.id,
      designation: p.designation,
      short_name: p.short_name,
      domain: p.domain,
      role: p.role,
      nation_code: p.nation_code,
      force_side: p.force_side,
    }))
}
