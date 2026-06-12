import { assessEngagement, computeOverlaps } from '@/lib/spectrum/engagement'
import { askCopilot } from '@/lib/spectrum/aerocopilot'
import type { CopilotResponse } from '@/lib/spectrum/aerocopilot'
import { cuasAssetToSpectrumBlue, resolveSpectrumUas } from '@/lib/map/spectrum-bridge'
import type {
  MapCuasAsset,
  MapUasAsset,
  OverlapVolume,
  PlacedCuas,
  PlacedUas,
} from '@/lib/map/types'
import type {
  BandOverlap,
  EngagementResult,
  Platform,
  SpectrumCapability,
} from '@/lib/spectrum/types'

export interface BandEntry {
  label: string
  axis: string
  range: string
  fn: string
  derived: boolean
}

export interface PlatformBandProfile {
  instanceId: string
  assetId: string
  name: string
  role: 'uas' | 'cuas'
  bands: BandEntry[]
  redundancies: string[]
}

export interface PropagationSummary {
  los_state: string
  path_loss_db: number
  multipath_margin_db: number
  jam_to_signal_db: number | null
  confidence: string
  model_tier: string[]
  propagationGated: boolean
  buildingObstructed: boolean
}

export interface PairLaydownAssessment {
  uasInstanceId: string
  cuasInstanceId: string
  uasName: string
  cuasName: string
  inDefeatRange: boolean
  defeatMatrixPk: number | null
  isImmune: boolean
  spectrum: EngagementResult
  bandOverlaps: BandOverlap[]
  uncoveredGaps: SpectrumCapability[]
  blueTactic: string
  blueSuccessPct: number
  uasSurvivalTactics: string[]
  propagation?: PropagationSummary
}

export interface LaydownSpectralAnalysis {
  uasProfiles: PlatformBandProfile[]
  cuasProfiles: PlatformBandProfile[]
  pairs: PairLaydownAssessment[]
  summary: {
    activeEngagements: number
    defeatLikely: number
    survivable: number
    outOfRange: number
  }
  copilot: CopilotResponse
}

function formatBandRange(lo: number, hi: number, unit: 'hz' | 'um'): string {
  if (unit === 'um') {
    const mid = (lo + hi) / 2
    return mid >= 1 ? `${mid.toFixed(2)} µm` : `${(mid * 1e3).toFixed(0)} nm`
  }
  const mid = (lo + hi) / 2
  return mid >= 1e9 ? `${(mid / 1e9).toFixed(2)} GHz` : `${(mid / 1e6).toFixed(0)} MHz`
}

function capabilityToBandEntry(cap: SpectrumCapability): BandEntry {
  const unit = cap.axis === 'eo_ir' ? 'um' : 'hz'
  const lo = unit === 'hz' ? (cap.freq_low_hz ?? 0) : (cap.wavelength_low_um ?? 0)
  const hi = unit === 'hz' ? (cap.freq_high_hz ?? 0) : (cap.wavelength_high_um ?? 0)
  return {
    label: cap.label,
    axis: cap.axis,
    range: formatBandRange(lo, hi, unit),
    fn: cap.fn,
    derived: Boolean(cap.derived),
  }
}

function collectRedundancies(platform: Platform): string[] {
  const out: string[] = []
  if (platform.gnss_dependency === 'none' || platform.gnss_dependency === 'low') {
    out.push('GNSS-independent navigation (visual / INS)')
  }
  if (platform.guidance_type?.includes('fibre') || platform.control_link_freq?.includes('fiber')) {
    out.push('Fibre-optic control — RF jamming ineffective')
  }
  if (platform.guidance_type?.toLowerCase().includes('autonomous')) {
    out.push('AI / autonomous terminal phase')
  }
  if (platform.control_link_freq?.includes('hopping')) {
    out.push('Frequency-hopping datalink')
  }

  const resistances = new Set<string>()
  for (const c of platform.capabilities ?? []) {
    for (const r of c.defeat_resistance ?? []) {
      if (r === 'rf_silent') resistances.add('RF-silent — no emissions to jam')
      else if (r.includes('jamming_high')) resistances.add('CRPA / anti-jam GNSS')
      else if (r.includes('jamming_med')) resistances.add('Partial anti-jam / hopping')
      else if (r === 'gnss_denied_capable') resistances.add('GNSS-denied capable')
    }
  }
  out.push(...resistances)
  return [...new Set(out)]
}

function spectrumSuccessPct(result: EngagementResult): number {
  switch (result.verdict) {
    case 'defeat_likely':
      return 82
    case 'partial':
      return 48
    case 'detect_only':
      return 22
    case 'no_engagement':
      return 12
    default:
      return 30
  }
}

function primaryCuasTactic(asset: MapCuasAsset, spectrum: EngagementResult): string {
  const methods = asset.defeat_methods ?? []
  if (methods.includes('laser') || methods.includes('directed_energy')) {
    return 'Directed-energy defeat — HEL burns through airframe electronics/optics within envelope'
  }
  if (methods.includes('kinetic')) {
    return 'Kinetic intercept — gun, missile, or ram within defeat envelope'
  }
  if (methods.includes('net')) {
    return 'Net capture / physical intercept within short range'
  }
  if (methods.includes('RF_jamming')) {
    return spectrum.overlaps.length > 0
      ? 'RF/GNSS jamming — deny control link and navigation bands that overlap threat emissions'
      : 'RF jammer emplaced but no band overlap — re-seat effector or change threat profile'
  }
  return asset.categoryLabel || 'C-UAS engagement per OSINT defeat matrix'
}

function combinedBlueSuccessPct(
  asset: MapCuasAsset,
  defeatPk: number | null,
  spectrum: EngagementResult,
  inRange: boolean,
): number {
  if (!inRange) return 0
  const matrixPk = defeatPk ?? 50
  const specPk = spectrumSuccessPct(spectrum)
  const methods = asset.defeat_methods ?? []

  if (methods.includes('kinetic') || methods.includes('laser') || methods.includes('directed_energy')) {
    return Math.round(matrixPk * 0.85 + specPk * 0.15)
  }
  if (methods.includes('RF_jamming')) {
    return Math.round(matrixPk * 0.45 + specPk * 0.55)
  }
  return Math.round((matrixPk + specPk) / 2)
}

function uasSurvivalPlaybook(
  uas: Platform,
  cuasName: string,
  spectrum: EngagementResult,
  inRange: boolean,
  blueSuccessPct: number,
): string[] {
  const tactics: string[] = []

  if (!inRange) {
    tactics.push('Remain outside C-UAS defeat envelope — geometry is primary survivability layer')
  } else if (blueSuccessPct >= 50) {
    tactics.push(`Exit ${cuasName} defeat range — lateral manoeuvre beyond ${inRange ? 'current' : ''} envelope`)
  }

  if (spectrum.verdict === 'no_engagement' || spectrum.overlaps.length === 0) {
    tactics.push('Exploit band mismatch — threat emissions not covered by jammer (maintain current link profile)')
  }

  for (const cap of spectrum.uncovered) {
    tactics.push(`Protect uncovered dependency: ${cap.label} — not in jammer overlap`)
  }

  if (uas.gnss_dependency === 'none' || uas.gnss_dependency === 'low') {
    tactics.push('Continue mission under GNSS denial — visual / INS navigation redundant path active')
  }

  if (uas.guidance_type?.includes('fibre')) {
    tactics.push('Maintain fibre-optic tether integrity — RF jamming cannot affect control path')
  }

  const hasHardened = (uas.capabilities ?? []).some((c) =>
    (c.defeat_resistance ?? []).some((r) => r.includes('jamming_high') || r.includes('jamming_med')),
  )
  if (hasHardened) {
    tactics.push('Use hardened / hopping link — expect degraded but not total jamming effect')
  }

  tactics.push('EMCON: suppress non-essential emissions when not required for terminal guidance')
  tactics.push('Terrain mask ingress/egress — stay below ridge lines where C-UAS LOS is blocked')

  if (blueSuccessPct < 50) {
    tactics.push('Current laydown favours UAS — press attack window before Blue repositions')
  }

  return [...new Set(tactics)].slice(0, 6)
}

function buildProfile(
  instanceId: string,
  assetId: string,
  name: string,
  role: 'uas' | 'cuas',
  platform: Platform,
): PlatformBandProfile {
  const caps = platform.capabilities ?? []
  return {
    instanceId,
    assetId,
    name,
    role,
    bands: caps.map(capabilityToBandEntry),
    redundancies: role === 'uas' ? collectRedundancies(platform) : [],
  }
}

function overlapByPair(
  overlaps: OverlapVolume[],
): Map<string, OverlapVolume> {
  const map = new Map<string, OverlapVolume>()
  for (const o of overlaps) {
    map.set(`${o.uasInstanceId}:${o.cuasInstanceId}`, o)
  }
  return map
}

export function analyzeLaydown(
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  overlapVolumes: OverlapVolume[],
): LaydownSpectralAnalysis {
  const overlapMap = overlapByPair(overlapVolumes)

  const uasPlatformByInstance = new Map<string, Platform>()
  const cuasPlatformByInstance = new Map<string, Platform>()

  const uasProfiles: PlatformBandProfile[] = []
  for (const u of placedUas) {
    const platform = resolveSpectrumUas(u.asset.id)
    if (!platform) continue
    uasPlatformByInstance.set(u.instanceId, platform)
    uasProfiles.push(
      buildProfile(u.instanceId, u.asset.id, u.asset.name, 'uas', platform),
    )
  }

  const cuasProfiles: PlatformBandProfile[] = []
  for (const c of placedCuas) {
    const platform = cuasAssetToSpectrumBlue(c.asset)
    cuasPlatformByInstance.set(c.instanceId, platform)
    cuasProfiles.push(
      buildProfile(c.instanceId, c.asset.id, c.asset.name, 'cuas', platform),
    )
  }

  const pairs: PairLaydownAssessment[] = []

  for (const u of placedUas) {
    const red = uasPlatformByInstance.get(u.instanceId)
    if (!red) continue

    for (const c of placedCuas) {
      const blue = cuasPlatformByInstance.get(c.instanceId)
      if (!blue) continue

      const key = `${u.instanceId}:${c.instanceId}`
      const vol = overlapMap.get(key)
      const inDefeatRange = Boolean(vol)
      const defeatMatrixPk = vol?.effectiveness_pct ?? null
      const isImmune = vol?.effectiveness_pct === 100 && vol?.isDefeat

      const spectrum = assessEngagement(red, blue)
      const bandOverlaps = computeOverlaps(red, blue)
      const blueSuccessPct = combinedBlueSuccessPct(
        c.asset,
        defeatMatrixPk,
        spectrum,
        inDefeatRange,
      )

      pairs.push({
        uasInstanceId: u.instanceId,
        cuasInstanceId: c.instanceId,
        uasName: u.asset.name,
        cuasName: c.asset.name,
        inDefeatRange,
        defeatMatrixPk,
        isImmune: Boolean(isImmune),
        spectrum,
        bandOverlaps,
        uncoveredGaps: spectrum.uncovered,
        blueTactic: primaryCuasTactic(c.asset, spectrum),
        blueSuccessPct,
        uasSurvivalTactics: uasSurvivalPlaybook(
          red,
          c.asset.name,
          spectrum,
          inDefeatRange,
          blueSuccessPct,
        ),
      })
    }
  }

  pairs.sort((a, b) => b.blueSuccessPct - a.blueSuccessPct)

  const activeEngagements = pairs.filter((p) => p.inDefeatRange).length
  const defeatLikely = pairs.filter((p) => p.inDefeatRange && p.blueSuccessPct >= 50).length
  const survivable = pairs.filter((p) => p.inDefeatRange && p.blueSuccessPct < 50).length
  const outOfRange = pairs.filter((p) => !p.inDefeatRange).length

  const uasNames = placedUas.map((u) => u.asset.name).join(', ')
  const cuasNames = placedCuas.map((c) => c.asset.name).join(', ')
  const topThreat = placedUas[0]?.asset.name ?? 'threat'
  const query =
    placedCuas.length === 1 && placedUas.length === 1
      ? `what if I use ${placedCuas[0].asset.name} against ${placedUas[0].asset.name}`
      : `how do I defeat ${topThreat}`

  const spectrumPlatforms: Platform[] = [
    ...[...uasPlatformByInstance.values()],
    ...[...cuasPlatformByInstance.values()],
  ]

  const baseCopilot = askCopilot(query, { platforms: spectrumPlatforms, radars: [] })

  const laydownReasoning = [
    `Laydown: ${placedUas.length} UAS × ${placedCuas.length} C-UAS — ${activeEngagements} geometric engagement${activeEngagements === 1 ? '' : 's'} inside defeat envelopes.`,
    `${defeatLikely} pairing${defeatLikely === 1 ? '' : 's'} favour Blue (≥50% combined success); ${survivable} survivable for Red; ${outOfRange} out of range.`,
    ...pairs
      .filter((p) => p.inDefeatRange)
      .slice(0, 4)
      .map(
        (p) =>
          `${p.cuasName} vs ${p.uasName}: ${p.blueSuccessPct}% — ${p.spectrum.headline}`,
      ),
  ]

  const copilot: CopilotResponse = {
    ...baseCopilot,
    answer: `Map laydown analysis — ${uasNames || 'no UAS'} vs ${cuasNames || 'no C-UAS'}. ${baseCopilot.answer}`,
    reasoning: [...laydownReasoning, ...(baseCopilot.reasoning ?? [])].slice(0, 8),
    followups: [
      'Which bands are not covered by the jammer?',
      'How does terrain masking change this assessment?',
      'What redundant navigation does the threat retain?',
      ...(baseCopilot.followups ?? []),
    ],
  }

  return {
    uasProfiles,
    cuasProfiles,
    pairs,
    summary: {
      activeEngagements,
      defeatLikely,
      survivable,
      outOfRange,
    },
    copilot,
  }
}

export function mergeAdjudicationIntoLaydown(
  analysis: LaydownSpectralAnalysis,
  adjudicated: {
    uasInstanceId: string
    cuasInstanceId: string
    combinedBlueSuccessPct: number
    propagation: {
      los_state: string
      path_loss_db: number
      multipath_margin_db: number
      jam_to_signal_db: number | null
      confidence: string
      model_tier: string[]
    }
    propagationGated: boolean
    buildingObstructed: boolean
  }[],
): LaydownSpectralAnalysis {
  const byKey = new Map(
    adjudicated.map((a) => [`${a.uasInstanceId}:${a.cuasInstanceId}`, a]),
  )
  const pairs = analysis.pairs.map((p) => {
    const adj = byKey.get(`${p.uasInstanceId}:${p.cuasInstanceId}`)
    if (!adj) return p
    return {
      ...p,
      blueSuccessPct: adj.combinedBlueSuccessPct,
      propagation: {
        los_state: adj.propagation.los_state,
        path_loss_db: adj.propagation.path_loss_db,
        multipath_margin_db: adj.propagation.multipath_margin_db,
        jam_to_signal_db: adj.propagation.jam_to_signal_db,
        confidence: adj.propagation.confidence,
        model_tier: adj.propagation.model_tier,
        propagationGated: adj.propagationGated,
        buildingObstructed: adj.buildingObstructed,
      },
      uasSurvivalTactics: adj.propagationGated
        ? [
            'Propagation LOS blocked — reposition for line-of-sight or escalate to kinetic/DEW',
            ...p.uasSurvivalTactics,
          ].slice(0, 6)
        : p.uasSurvivalTactics,
    }
  })
  pairs.sort((a, b) => b.blueSuccessPct - a.blueSuccessPct)
  const defeatLikely = pairs.filter((p) => p.inDefeatRange && p.blueSuccessPct >= 50).length
  const survivable = pairs.filter((p) => p.inDefeatRange && p.blueSuccessPct < 50).length
  return {
    ...analysis,
    pairs,
    summary: {
      ...analysis.summary,
      defeatLikely,
      survivable,
    },
  }
}
