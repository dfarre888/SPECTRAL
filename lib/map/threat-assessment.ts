import { analyzeLaydown, type LaydownSpectralAnalysis, type PairLaydownAssessment } from '@/lib/map/laydown-analysis'
import { buildOverlapVolume, uasToCuasDistance3dM } from '@/lib/map/overlap'
import type {
  MapCuasAsset,
  OverlapVolume,
  PlacedCuas,
  PlacedUas,
} from '@/lib/map/types'
import type { EngagementResult } from '@/lib/spectrum/types'

export interface SystemRecommendation {
  assetId: string
  name: string
  pct: number
  reason: string
}

export interface ThreatAssessment {
  uasInstanceId: string
  uasName: string
  detectionPct: number
  defeatPct: number
  inEngagement: boolean
  bestPlacedCuas: { instanceId: string; name: string } | null
  recommendedDetection: SystemRecommendation | null
  recommendedDefeat: SystemRecommendation | null
  tacticNote: string | null
}

function defaultMatrixPk(asset: MapCuasAsset): number {
  const methods = asset.defeat_methods ?? []
  if (methods.includes('laser') || methods.includes('directed_energy')) return 72
  if (methods.includes('kinetic') || methods.includes('net')) return 68
  if (methods.includes('RF_jamming')) return 58
  return 50
}

function virtualCuasAtThreat(uas: PlacedUas, asset: MapCuasAsset): PlacedCuas {
  return {
    instanceId: `virtual-${asset.id}-${uas.instanceId}`,
    asset,
    lon: uas.lon,
    lat: uas.lat,
    terrainAMSL: uas.terrainAMSL,
    hasTerrainMasking: false,
  }
}

/** Pd — detection probability from spectrum overlap and effector class (OSINT training estimate). */
export function computeDetectionPct(
  spectrum: EngagementResult,
  inRange: boolean,
  defeatMethods: string[],
): number {
  if (!inRange) return 8

  if (spectrum.verdict === 'detect_only') return 86

  const rfOverlap = spectrum.overlaps.length
  if (defeatMethods.includes('RF_jamming') && rfOverlap > 0) {
    return Math.min(90, 56 + rfOverlap * 10)
  }

  if (
    defeatMethods.some((m) =>
      ['kinetic', 'laser', 'directed_energy', 'net'].includes(m),
    )
  ) {
    return spectrum.verdict === 'no_engagement' ? 58 : 66
  }

  if (spectrum.verdict === 'no_engagement') return 24
  if (spectrum.verdict === 'partial') return 52
  if (spectrum.verdict === 'defeat_likely') return 70
  return 42
}

function scoreVirtualPair(
  uas: PlacedUas,
  asset: MapCuasAsset,
  defeatPk?: number,
): PairLaydownAssessment | null {
  const virtual = virtualCuasAtThreat(uas, asset)
  const inRange = uasToCuasDistance3dM(uas, virtual) <= asset.defeat_range_m
  const pk = defeatPk ?? defaultMatrixPk(asset)
  const vol = buildOverlapVolume(uas, virtual, pk, false)
  const analysis = analyzeLaydown([uas], [virtual], inRange ? [vol] : [])
  return analysis.pairs[0] ?? null
}

function recommendationReason(
  asset: MapCuasAsset,
  pair: PairLaydownAssessment,
  kind: 'detection' | 'defeat',
): string {
  if (kind === 'detection') {
    if (pair.spectrum.verdict === 'detect_only') return 'Passive RF / ESM cueing — detection without defeat'
    if (pair.spectrum.overlaps.length > 0) return 'Band overlap enables RF signature detection'
    return 'Radar / EO-IR cue within defeat envelope'
  }
  if (pair.isImmune) return 'Threat immune to this effector — see Defeat Matrix'
  if (!pair.inDefeatRange) return `Outside ${asset.defeat_range_km} km envelope at threat position`
  if (pair.spectrum.verdict === 'defeat_likely') return 'Spectrum + geometry favour defeat'
  if (pair.spectrum.overlaps.length === 0) return 'Kinetic / DEW path — no RF overlap required'
  return 'Combined matrix Pk and band overlap'
}

function rankCatalog(
  uas: PlacedUas,
  catalog: MapCuasAsset[],
  kind: 'detection' | 'defeat',
): SystemRecommendation | null {
  let best: SystemRecommendation | null = null

  for (const asset of catalog) {
    const pair = scoreVirtualPair(uas, asset)
    if (!pair) continue

    const pct =
      kind === 'detection'
        ? computeDetectionPct(pair.spectrum, pair.inDefeatRange, asset.defeat_methods)
        : pair.blueSuccessPct

    if (!best || pct > best.pct) {
      best = {
        assetId: asset.id,
        name: asset.name,
        pct,
        reason: recommendationReason(asset, pair, kind),
      }
    }
  }

  return best
}

function bestPlacedPair(
  uasInstanceId: string,
  analysis: LaydownSpectralAnalysis,
): PairLaydownAssessment | null {
  const pairs = analysis.pairs.filter((p) => p.uasInstanceId === uasInstanceId)
  if (pairs.length === 0) return null
  const inRange = pairs.filter((p) => p.inDefeatRange)
  const pool = inRange.length > 0 ? inRange : pairs
  return [...pool].sort((a, b) => b.blueSuccessPct - a.blueSuccessPct)[0]
}

export function buildThreatAssessments(
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  analysis: LaydownSpectralAnalysis,
  catalogCuas: MapCuasAsset[],
  overlaps: OverlapVolume[],
): ThreatAssessment[] {
  const overlapByCuas = new Map(placedCuas.map((c) => [c.instanceId, c]))

  return placedUas.map((uas) => {
    const bestPair = bestPlacedPair(uas.instanceId, analysis)
    const inEngagement = Boolean(bestPair?.inDefeatRange)

    let detectionPct = 8
    let defeatPct = 0
    let bestPlacedCuas: ThreatAssessment['bestPlacedCuas'] = null
    let tacticNote: string | null = null

    if (bestPair) {
      const cuas = overlapByCuas.get(bestPair.cuasInstanceId)
      const methods = cuas?.asset.defeat_methods ?? []
      detectionPct = computeDetectionPct(bestPair.spectrum, bestPair.inDefeatRange, methods)
      defeatPct = bestPair.inDefeatRange ? bestPair.blueSuccessPct : 0
      bestPlacedCuas = {
        instanceId: bestPair.cuasInstanceId,
        name: bestPair.cuasName,
      }
      tacticNote = bestPair.blueTactic
    } else if (placedCuas.length > 0) {
      tacticNote = 'Threat outside all placed C-UAS defeat envelopes — reposition effectors'
      detectionPct = 12
    } else {
      tacticNote = 'Place a defeat system to assess engagement geometry'
    }

    const recommendedDetection = rankCatalog(uas, catalogCuas, 'detection')
    const recommendedDefeat = rankCatalog(uas, catalogCuas, 'defeat')

    // Prefer catalog picks that beat current laydown when nothing is in range
    if (!inEngagement && recommendedDefeat && recommendedDefeat.pct > defeatPct) {
      defeatPct = 0
    }

    return {
      uasInstanceId: uas.instanceId,
      uasName: uas.asset.name,
      detectionPct,
      defeatPct,
      inEngagement,
      bestPlacedCuas,
      recommendedDetection,
      recommendedDefeat,
      tacticNote,
    }
  })
}
