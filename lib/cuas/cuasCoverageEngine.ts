// SPECTRAL — C-UAS coverage & siting engine
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import { haversineM } from '@/lib/propagation/geo'

export const CUAS_PERFORMANCE_REF = 'SOVEREIGN_CORE_BOUNDARY' as const

export interface CuasSiteInput {
  id: string
  name: string
  lon: number
  lat: number
  defeat_range_m: number
}

export interface UasThreatInput {
  id: string
  name: string
  lon: number
  lat: number
}

export interface CoverageGap {
  uas_id: string
  uas_name: string
  lon: number
  lat: number
  nearest_cuas_m: number
}

export interface SitingRecommendation {
  lon: number
  lat: number
  rationale: string
  expected_additional_coverage: number
}

export interface CuasCoverageAnalysis {
  performance_ref: typeof CUAS_PERFORMANCE_REF
  verdict: 'adequate' | 'partial' | 'inadequate' | 'no_assets'
  covered_count: number
  total_threats: number
  coverage_pct: number
  gaps: CoverageGap[]
  siting_recommendations: SitingRecommendation[]
  notes: string
}

export class CuasCoverageEngine {
  readonly performance_ref = CUAS_PERFORMANCE_REF

  analyseCoverage(cuasSites: CuasSiteInput[], threats: UasThreatInput[]): CuasCoverageAnalysis {
    if (cuasSites.length === 0) {
      return {
        performance_ref: this.performance_ref,
        verdict: 'no_assets',
        covered_count: 0,
        total_threats: threats.length,
        coverage_pct: 0,
        gaps: threats.map((t) => ({
          uas_id: t.id,
          uas_name: t.name,
          lon: t.lon,
          lat: t.lat,
          nearest_cuas_m: Infinity,
        })),
        siting_recommendations: [],
        notes: 'No C-UAS assets placed — laydown cannot defeat inbound UAS.',
      }
    }

    const gaps: CoverageGap[] = []
    let covered = 0

    for (const t of threats) {
      let best = Infinity
      let inRange = false
      for (const c of cuasSites) {
        const d = haversineM(c.lat, c.lon, t.lat, t.lon)
        best = Math.min(best, d)
        if (d <= c.defeat_range_m) inRange = true
      }
      if (inRange) covered += 1
      else {
        gaps.push({
          uas_id: t.id,
          uas_name: t.name,
          lon: t.lon,
          lat: t.lat,
          nearest_cuas_m: Math.round(best),
        })
      }
    }

    const total = threats.length
    const coverage_pct = total === 0 ? 100 : Math.round((covered / total) * 100)
    let verdict: CuasCoverageAnalysis['verdict'] = 'adequate'
    if (total === 0) verdict = 'adequate'
    else if (coverage_pct === 0) verdict = 'inadequate'
    else if (coverage_pct < 100) verdict = 'partial'

    const siting_recommendations = gaps.length > 0 ? [this.findOptimalSitingPosition(cuasSites, threats, gaps)] : []

    return {
      performance_ref: this.performance_ref,
      verdict,
      covered_count: covered,
      total_threats: total,
      coverage_pct,
      gaps,
      siting_recommendations,
      notes:
        verdict === 'adequate'
          ? 'All placed threats fall within at least one C-UAS defeat envelope (OSINT range).'
          : 'Gap analysis uses haversine ground range vs catalog defeat_range_m — terrain masking not applied in this training layer.',
    }
  }

  computeCoveragePolygon(lon: number, lat: number, radius_m: number, segments = 32): Array<{ lon: number; lat: number }> {
    const ring: Array<{ lon: number; lat: number }> = []
    const latRad = (lat * Math.PI) / 180
    const mPerDegLat = 111_320
    const mPerDegLon = 111_320 * Math.cos(latRad)
    for (let i = 0; i <= segments; i++) {
      const theta = (2 * Math.PI * i) / segments
      ring.push({
        lon: lon + (radius_m * Math.cos(theta)) / mPerDegLon,
        lat: lat + (radius_m * Math.sin(theta)) / mPerDegLat,
      })
    }
    return ring
  }

  findOptimalSitingPosition(
    cuasSites: CuasSiteInput[],
    threats: UasThreatInput[],
    gaps?: CoverageGap[],
  ): SitingRecommendation {
    const gapTargets = gaps ?? this.analyseCoverage(cuasSites, threats).gaps

    if (gapTargets.length === 0) {
      const pts = threats.map((t) => ({ lon: t.lon, lat: t.lat }))
      const lon = pts.reduce((s, p) => s + p.lon, 0) / (pts.length || 1)
      const lat = pts.reduce((s, p) => s + p.lat, 0) / (pts.length || 1)
      return {
        lon,
        lat,
        rationale: 'Maintain overlap at threat centroid — no uncovered threats.',
        expected_additional_coverage: 0,
      }
    }

    const refRange = cuasSites.length
      ? cuasSites.reduce((a, c) => a + c.defeat_range_m, 0) / cuasSites.length
      : 3_000

    let bestLon = gapTargets[0].lon
    let bestLat = gapTargets[0].lat
    let bestScore = -1

    for (const g of gapTargets) {
      for (let k = 0; k < 8; k++) {
        const angle = (Math.PI * 2 * k) / 8
        const offset_m = Math.min(refRange * 0.35, Math.max(500, g.nearest_cuas_m * 0.25))
        const latRad = (g.lat * Math.PI) / 180
        const lon = g.lon + (offset_m * Math.cos(angle)) / (111_320 * Math.cos(latRad))
        const lat = g.lat + (offset_m * Math.sin(angle)) / 111_320
        let score = 0
        for (const t of threats) {
          if (haversineM(lat, lon, t.lat, t.lon) <= refRange) score += 1
        }
        if (score > bestScore) {
          bestScore = score
          bestLon = lon
          bestLat = lat
        }
      }
    }

    return {
      lon: parseFloat(bestLon.toFixed(6)),
      lat: parseFloat(bestLat.toFixed(6)),
      rationale: `Candidate site closes ${gapTargets.length} gap(s) using mean OSINT defeat range (~${Math.round(refRange)} m).`,
      expected_additional_coverage: Math.max(1, Math.min(gapTargets.length, bestScore)),
    }
  }
}
