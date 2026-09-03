import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  BMI_SEED_BUNDLE,
} from '@/data/seed-bmi-pitchblack2026'
import type { BmiExerciseBundle } from '@/lib/bmi/bmi-types'

export async function fetchBmiExercise(
  exerciseId: string = 'PITCH_BLACK_2026',
): Promise<BmiExerciseBundle> {
  try {
    const supabase = await createClient()
    const { data: exercise } = await supabase
      .from('bmi_exercises')
      .select('id, name, start_date, end_date, note')
      .eq('id', exerciseId)
      .maybeSingle()

    if (!exercise) {
      return BMI_SEED_BUNDLE
    }

    const [{ data: nations }, { data: bases }, { data: platforms }] = await Promise.all([
      supabase.from('bmi_exercise_nations').select('*').eq('exercise_id', exerciseId),
      supabase.from('bmi_exercise_bases').select('*').eq('exercise_id', exerciseId),
      supabase.from('bmi_exercise_platforms').select('*').eq('exercise_id', exerciseId),
    ])

    if (!platforms?.length) {
      return BMI_SEED_BUNDLE
    }

    const platformIds = platforms.map((p) => p.id)
    const [{ data: sensors }, { data: comms }] = await Promise.all([
      supabase.from('bmi_platform_sensors').select('*').in('platform_id', platformIds),
      supabase.from('bmi_platform_comms').select('*').in('platform_id', platformIds),
    ])

    return {
      meta: {
        id: exercise.id,
        name: exercise.name,
        start_date: exercise.start_date,
        end_date: exercise.end_date,
        note: exercise.note ?? '',
        nations: (nations ?? []).map((n) => ({
          code: n.code,
          name: n.name,
          participation: n.participation,
          first_time: n.first_time ?? undefined,
        })),
        bases: (bases ?? []).map((b) => ({
          id: b.id,
          name: b.name,
          lat: b.lat,
          lon: b.lon,
          role: b.role,
        })),
      },
      platforms: platforms.map((p) => ({
        id: p.id,
        exercise_id: p.exercise_id,
        nation_code: p.nation_code,
        designation: p.designation,
        short_name: p.short_name,
        domain: p.domain,
        role: p.role,
        qty: p.qty,
        base_id: p.base_id,
        force_side: p.force_side,
        open_source_summary: p.open_source_summary,
        data_confidence: p.data_confidence,
        sources: p.sources ?? [],
        sensors: (sensors ?? [])
          .filter((s) => s.platform_id === p.id)
          .map((s) => ({
            id: s.id,
            platform_id: s.platform_id,
            kind: s.kind,
            label: s.label,
            band: s.band,
            antenna: s.antenna,
            role: s.role,
            can_detect: s.can_detect ?? [],
            cannot_detect: s.cannot_detect ?? [],
            strengths: s.strengths,
            limitations: s.limitations,
            confidence: s.confidence,
            intel_note: s.intel_note,
            sources: s.sources ?? [],
            performance_ref: s.performance_ref,
            radar_catalog_id: s.radar_catalog_id,
          })),
        comms: (comms ?? [])
          .filter((c) => c.platform_id === p.id)
          .map((c) => ({
            id: c.id,
            platform_id: c.platform_id,
            kind: c.kind,
            standard: c.standard,
            band: c.band,
            label: c.label,
            gateway_capable: c.gateway_capable,
            comsec_note: c.comsec_note,
            pnt_dependent: c.pnt_dependent,
            data_confidence: c.data_confidence,
            sources: c.sources ?? [],
            boundary_note: c.boundary_note,
            spectrum_capability_id: c.spectrum_capability_id,
          })),
      })),
    }
  } catch {
    return BMI_SEED_BUNDLE
  }
}

export function getBmiPlatformCount(): number {
  return BMI_SEED_BUNDLE.platforms.length
}
