/**
 * Terrain viewshed for radar and effector masking.
 *
 * Replaces visibleDistanceGroundLevel(), which had four defects that together
 * made drawn masking look arbitrary:
 *
 *  1. Unresolved terrain samples arrive as NaN, and every comparison against
 *     NaN is false. An unresolved sample therefore passed the visibility test
 *     AND failed to raise the horizon angle — it was silently transparent.
 *     Cesium resolves tiles at different detail depending on camera and cache,
 *     so the same emitter produced a different viewshed run to run.
 *
 *  2. Earth curvature was ignored, while radio-horizon.ts alongside it uses a
 *     4/3 effective radius. At 100 km the bulge is ~147 m — larger than most of
 *     the terrain being tested against.
 *
 *  3. Emitter height came from TERRAIN_SURFACE_AGL_M, a 2 m z-fighting offset
 *     for draped geometry. Every radar sat on a 2 m mast.
 *
 *  4. A single visible distance per azimuth cannot express ground that becomes
 *     visible again beyond a ridge. Real terrain undulates, so the drawn dead
 *     ground was wrong wherever it mattered.
 *
 * The algorithm is the standard maximum-elevation-angle sweep, but it returns a
 * visibility profile and reports its own data quality.
 *
 * Cesium has no built-in viewshed: sampleTerrainMostDetailed supplies heights
 * and the analysis is ours. Ray picking against the globe only tests tiles
 * currently loaded at screen detail, which is precisely the non-determinism
 * being fixed here, so it is not used.
 */

/** Mean Earth radius times 4/3 — standard refraction allowance. */
export const EFFECTIVE_EARTH_RADIUS_M = 6371000 * (4 / 3)

/** How an unresolved (NaN) terrain sample is treated. */
export type UnresolvedPolicy =
  /** Treat as opaque. Conservative: never claims coverage it cannot prove. */
  | 'block'
  /** Carry the last resolved height forward. Best for sparse dropouts. */
  | 'carry'
  /** Treat as transparent — the previous behaviour. Retained for comparison. */
  | 'ignore'

export interface ViewshedOptions {
  /** Antenna height above ground level, metres. */
  emitterMastM?: number
  /** Target height above ground level, metres. */
  targetAglM?: number
  /**
   * Terrain tolerance, metres. Defaults to 0.
   *
   * Non-zero values also extend the smooth-earth horizon, because near the
   * horizon the angular differences are tiny and a few metres of allowance
   * dominates them: 5 m pushes a 10 m mast from 18.9 km to 23.9 km, 27% long.
   * Set it only where a genuine terrain tolerance is wanted, and expect the
   * horizon to move with it.
   */
  clearanceM?: number
  earthRadiusM?: number
  unresolvedPolicy?: UnresolvedPolicy
}

export interface RaySegment {
  fromM: number
  toM: number
  visible: boolean
}

export interface RayVisibility {
  segments: RaySegment[]
  /** Start of the first dead ground, or null if the ray is clear throughout. */
  firstMaskM: number | null
  /** Total visible length along the ray, metres. */
  visibleLengthM: number
  /** Samples that never resolved — surfaced so the UI can qualify the result. */
  unresolvedSamples: number
  totalSamples: number
}

const DEFAULTS: Required<ViewshedOptions> = {
  emitterMastM: 10,
  targetAglM: 30,
  clearanceM: 0,
  earthRadiusM: EFFECTIVE_EARTH_RADIUS_M,
  unresolvedPolicy: 'block',
}

/**
 * Drop of the curved surface below the tangent plane at the emitter.
 * Subtracting this from terrain height converts to flat-plane geometry.
 */
export function curvatureDropM(distanceM: number, earthRadiusM = EFFECTIVE_EARTH_RADIUS_M): number {
  return (distanceM * distanceM) / (2 * earthRadiusM)
}

/**
 * Visibility profile along one ray.
 *
 * `emitterGroundM` is terrain height at the emitter; the mast is added here so
 * callers cannot accidentally pass a render offset as antenna height.
 */
export function rayVisibility(
  stepHeights: readonly number[],
  stepM: number,
  emitterGroundM: number,
  options: ViewshedOptions = {},
): RayVisibility {
  const o = { ...DEFAULTS, ...options }
  const emitterAltM = emitterGroundM + o.emitterMastM

  let maxTerrainAngle = -Math.PI / 2
  let lastResolved = emitterGroundM
  let unresolved = 0

  const flags: boolean[] = []

  for (let s = 0; s < stepHeights.length; s++) {
    const d = (s + 1) * stepM
    const raw = stepHeights[s]
    const isUnresolved = !Number.isFinite(raw)

    let hTerrain: number
    if (isUnresolved) {
      unresolved++
      if (o.unresolvedPolicy === 'block') {
        // Opaque: mark not-visible and raise the horizon so everything beyond
        // is masked too. Refusing to claim unproven coverage is the safe error.
        flags.push(false)
        maxTerrainAngle = Math.PI / 2
        continue
      }
      if (o.unresolvedPolicy === 'ignore') {
        flags.push(true)
        continue
      }
      hTerrain = lastResolved
    } else {
      hTerrain = raw
      lastResolved = raw
    }

    // Convert to tangent-plane geometry by removing the curvature drop.
    const drop = curvatureDropM(d, o.earthRadiusM)
    const hTerrainEff = hTerrain - drop
    const hTargetEff = hTerrainEff + o.targetAglM

    const elevToTarget = Math.atan2(hTargetEff - emitterAltM, d)
    const clearanceAngle = Math.atan(o.clearanceM / d)
    const visible = elevToTarget >= maxTerrainAngle - clearanceAngle
    flags.push(visible)

    const elevToTerrain = Math.atan2(hTerrainEff - emitterAltM, d)
    if (elevToTerrain > maxTerrainAngle) maxTerrainAngle = elevToTerrain
  }

  // Collapse the per-sample flags into runs.
  const segments: RaySegment[] = []
  let runStart = 0
  for (let s = 0; s < flags.length; s++) {
    const last = s === flags.length - 1
    if (last || flags[s] !== flags[s + 1]) {
      segments.push({ fromM: runStart * stepM, toM: (s + 1) * stepM, visible: flags[s] })
      runStart = s + 1
    }
  }

  const visibleLengthM = segments.filter((x) => x.visible).reduce((a, x) => a + (x.toM - x.fromM), 0)
  const firstMask = segments.find((x) => !x.visible)

  return {
    segments,
    firstMaskM: firstMask ? firstMask.fromM : null,
    visibleLengthM,
    unresolvedSamples: unresolved,
    totalSamples: stepHeights.length,
  }
}

/**
 * Azimuth step that keeps adjacent rays within `spacingM` at maximum range.
 *
 * The previous fixed 5 degrees left 4.4 km between rays at 50 km, so a ridge
 * could be caught or missed depending on where it happened to fall. Clamped so
 * a very long range cannot demand an unusable number of samples.
 */
export function azimuthStepDeg(maxRangeM: number, spacingM = 250, minDeg = 0.5, maxDeg = 5): number {
  if (maxRangeM <= 0) return maxDeg
  const deg = (spacingM / maxRangeM) * (180 / Math.PI)
  return Math.min(maxDeg, Math.max(minDeg, deg))
}

export interface ViewshedQuality {
  unresolvedSamples: number
  totalSamples: number
  unresolvedPct: number
  /** False when enough terrain was missing that the result should be qualified. */
  trustworthy: boolean
}

/** Aggregate data quality across a full sweep. */
export function viewshedQuality(rays: readonly RayVisibility[], warnPct = 5): ViewshedQuality {
  const unresolvedSamples = rays.reduce((a, r) => a + r.unresolvedSamples, 0)
  const totalSamples = rays.reduce((a, r) => a + r.totalSamples, 0)
  const pct = totalSamples === 0 ? 0 : (unresolvedSamples / totalSamples) * 100
  return {
    unresolvedSamples,
    totalSamples,
    unresolvedPct: Math.round(pct * 10) / 10,
    trustworthy: pct <= warnPct,
  }
}

/**
 * Sample budget for a full 360-degree sweep.
 *
 * Terrain sampling dominates the cost of a viewshed, and the count is the
 * product of azimuth rays and radial steps — so raising azimuth resolution
 * without a budget is how a map hangs. At 50 km a 0.5 degree step over 50 m
 * radial steps is 720 rays x 1000 steps = 720,000 samples.
 *
 * The plan spends the budget in a fixed order of preference: keep radial
 * resolution fine enough to catch ridges, then buy as much azimuth resolution
 * as remains. Radial step is relaxed only once azimuth is already at its floor.
 */
export interface SweepPlan {
  azStepDeg: number
  stepM: number
  rayCount: number
  stepsPerRay: number
  totalSamples: number
  /** True when the budget forced coarser sampling than requested. */
  budgetLimited: boolean
}

export const DEFAULT_SWEEP_BUDGET = 60_000

export function planSweep(
  maxRangeM: number,
  budget = DEFAULT_SWEEP_BUDGET,
  preferredStepM = 50,
): SweepPlan {
  const idealAz = azimuthStepDeg(maxRangeM)
  let stepM = preferredStepM
  let azStepDeg = idealAz
  let budgetLimited = false

  const count = (az: number, st: number) =>
    Math.ceil(360 / az) * Math.max(1, Math.floor(maxRangeM / st))

  // Widen azimuth first — losing angular detail costs less than missing a ridge.
  while (count(azStepDeg, stepM) > budget && azStepDeg < 5) {
    azStepDeg = Math.min(5, azStepDeg * 1.25)
    budgetLimited = true
  }
  // Only then coarsen radially.
  while (count(azStepDeg, stepM) > budget && stepM < 400) {
    stepM = Math.min(400, stepM * 1.25)
    budgetLimited = true
  }

  const rayCount = Math.ceil(360 / azStepDeg)
  const stepsPerRay = Math.max(1, Math.floor(maxRangeM / stepM))
  return {
    azStepDeg,
    stepM,
    rayCount,
    stepsPerRay,
    totalSamples: rayCount * stepsPerRay,
    budgetLimited,
  }
}
