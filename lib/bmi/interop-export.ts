/**
 * BMI interop export stub — Phase 6 attach to battlespace_plans / export-afsim pattern.
 */

import type { InteropGraph, PacePlan } from '@/lib/bmi/bmi-types'

export const BMI_INTEROP_EXPORT_VERSION = 1

export interface BmiInteropExportBundle {
  version: typeof BMI_INTEROP_EXPORT_VERSION
  exercise_id: string
  graph_summary: {
    link_count: number
    gateway_dependent: string[]
    isolated_pair_count: number
  }
  pace_plans: PacePlan[]
  note: string
}

export function buildInteropExportBundle(
  exerciseId: string,
  graph: InteropGraph,
  pacePlans: PacePlan[],
): BmiInteropExportBundle {
  return {
    version: BMI_INTEROP_EXPORT_VERSION,
    exercise_id: exerciseId,
    graph_summary: {
      link_count: graph.links.length,
      gateway_dependent: graph.gateway_dependent,
      isolated_pair_count: graph.isolated_pairs.length,
    },
    pace_plans: pacePlans,
    note: 'OSINT training export — not operational COMSEC material',
  }
}
