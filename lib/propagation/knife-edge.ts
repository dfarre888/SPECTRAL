/**
 * Knife-edge diffraction (ITU-R P.526 inspired).
 * Single-edge: Bullington-style Fresnel parameter.
 * Multi-edge: simplified Deygout main-obstacle + Epstein-Peterson secondary cascade.
 * Confidence: Estimated — not a site survey model.
 */

export interface DiffractionEdge {
  /** Negative = obstruction below LOS (m). */
  clearance_m: number
  /** Distance from emitter to edge (m). */
  distance_from_emitter_m: number
}

/** Single knife-edge loss (dB). */
export function knifeEdgeLossDb(
  clearance_m: number,
  freq_hz: number,
  distance_m: number,
): number {
  if (clearance_m >= 0) return 0
  const lambda = 299792458 / freq_hz
  const v = clearance_m * Math.sqrt((2 * distance_m) / (lambda * Math.max(distance_m, 1)))
  const absV = Math.abs(v)
  if (absV < 0.8) return 6 + 9 * absV - 1.27 * absV * absV
  return 13 + 20 * Math.log10(absV)
}

/**
 * Deygout chain for multiple diffraction edges.
 * Selects dominant obstacle, applies effective distance for main edge,
 * then cascades secondary edge excess (Epstein-Peterson heuristic).
 * Single-edge Bullington underestimates loss in ridge-heavy terrain — use this
 * when terrain sampling yields multiple obstructions.
 */
export function deygoutChainLossDb(
  edges: DiffractionEdge[],
  freq_hz: number,
  total_distance_m: number,
): number {
  if (edges.length === 0) return 0
  if (edges.length === 1) {
    const e = edges[0]
    const d2 = Math.max(total_distance_m - e.distance_from_emitter_m, 1)
    const effectiveDist = (e.distance_from_emitter_m * d2) / (e.distance_from_emitter_m + d2)
    return knifeEdgeLossDb(e.clearance_m, freq_hz, effectiveDist)
  }

  let mainIdx = 0
  for (let i = 1; i < edges.length; i++) {
    if (edges[i].clearance_m < edges[mainIdx].clearance_m) mainIdx = i
  }

  const main = edges[mainIdx]
  const d1 = Math.max(main.distance_from_emitter_m, 1)
  const d2 = Math.max(total_distance_m - main.distance_from_emitter_m, 1)
  const effectiveDist = (d1 * d2) / (d1 + d2)
  let loss = knifeEdgeLossDb(main.clearance_m, freq_hz, effectiveDist)

  for (let i = 0; i < edges.length; i++) {
    if (i === mainIdx) continue
    const edge = edges[i]
    const edgeD2 = Math.max(total_distance_m - edge.distance_from_emitter_m, 1)
    const edgeEff = (edge.distance_from_emitter_m * edgeD2) / (edge.distance_from_emitter_m + edgeD2)
    const secLoss = knifeEdgeLossDb(edge.clearance_m, freq_hz, edgeEff)
    loss += Math.max(0, secLoss - 6) * 0.55
  }

  return loss
}
