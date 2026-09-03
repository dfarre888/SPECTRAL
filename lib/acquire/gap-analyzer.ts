/**
 * GAP analysis — required effect vs current OrBat + defeat coverage
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import type {
  AcquireTemplate,
  DefeatCoverageRow,
  GapAnalysisResult,
  OrbatPlatformSummary,
} from '@/lib/acquire/acquire-types'

const C_UAS_KEYWORDS = /cuas|c-uas|gepard|nasams|iris|pantsir|skynex|counter.?uas|spaag|shorad|lmadis|iron.?dome|tamir|skyguard|ceptor/i

function isCuasSystem(systemId: string, name: string): boolean {
  return C_UAS_KEYWORDS.test(systemId) || C_UAS_KEYWORDS.test(name)
}

export function analyzeGap(
  template: AcquireTemplate,
  orbat: OrbatPlatformSummary[],
  defeatCoverage: DefeatCoverageRow[],
  threatName: string,
): GapAnalysisResult {
  const requiredEffect =
    template.required_effect ?? 'Layered C-UAS defence against one-way attack profiles'

  const cuasInOrbat = orbat.filter(
    (p) =>
      p.domain === 'ground' &&
      /cuas|c2_ground|radar_ground|shorad/i.test(p.role),
  )

  const effectiveCoverage = defeatCoverage.filter(
    (row) =>
      row.platform_id === template.threat_platform_id &&
      !row.is_immune &&
      (row.kinetic_pct ?? 0) >= 50,
  )

  const existingCuasSystems = effectiveCoverage
    .filter((row) => isCuasSystem(row.defeat_system_id, row.defeat_system_name))
    .map((row) => row.defeat_system_name)

  const coverageGaps: string[] = []

  if (cuasInOrbat.length === 0) {
    coverageGaps.push(
      `${template.location} exercise laydown has no dedicated C-UAS ground nodes — BMI OrBat is air-centric (fighters, AEW, transport).`,
    )
  }

  if (existingCuasSystems.length === 0) {
    coverageGaps.push(
      'Defeat matrix shows no fielded C-UAS layer at this base — fighter AD alone is cost-catastrophic vs OWA saturation.',
    )
  } else {
    coverageGaps.push(
      `Catalogued C-UAS options exist globally (${existingCuasSystems.slice(0, 2).join(', ')}) but are not present in the ${template.location} OrBat.`,
    )
  }

  coverageGaps.push(
    `Required effect: ${requiredEffect}. Shahed-class OWA demands magazine depth + favourable exchange — not expending GBAD missiles on $20k threats.`,
  )

  const airCount = orbat.filter((p) => p.domain === 'air').length
  const orbatSummary = [
    `${orbat.length} platform(s) at ${template.base_id} (${airCount} air, ${orbat.length - airCount} ground/support).`,
    'Coalition fighters provide air defence but not optimised C-UAS magazine economics.',
  ]

  const severity: GapAnalysisResult['severity'] =
    cuasInOrbat.length === 0 && existingCuasSystems.length === 0 ? 'critical' : 'high'

  return {
    threat_platform_id: template.threat_platform_id,
    threat_name: threatName,
    location: template.location,
    base_id: template.base_id,
    required_effect: requiredEffect,
    orbat_platform_count: orbat.length,
    orbat_summary: orbatSummary,
    existing_cuas_systems: existingCuasSystems,
    coverage_gaps: coverageGaps,
    severity,
    narrative: `${threatName} OWA gap at ${template.location}: coalition air package without layered C-UAS. Acquisition should prioritise point-defence kinetic with OSINT-verified exchange ratio before SAM expenditure.`,
  }
}
