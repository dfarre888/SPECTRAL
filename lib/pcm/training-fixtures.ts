/**
 * OSINT training fixtures — PCM / force-design when DB auth is unavailable.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { ForceDesignQuestion, ForceDesignReport, RunOutcome } from '@/lib/moat/forceDesignEngine'
import { forceDesignEngine } from '@/lib/moat/forceDesignEngine'
import { buildAARDocument, type AARDocument } from '@/lib/pcm/aar-engine'
import type { PCM } from '@/lib/pcm/spectral.types'

export const TRAINING_FORCE_DESIGN_QUESTION: ForceDesignQuestion = {
  id: 'fd-training-001',
  question: 'Is a 12-interceptor laydown sufficient against decoy-heavy OWA saturation?',
  threat_profile: 'Adaptive OWA with high decoy ratio (Shahed-class + Gerbera decoys)',
  success_criterion: '>=80% mission success across 12 adaptive repetitions',
  runs_requested: 12,
  force_structure: [
    {
      label: 'Option A: 12× Coyote Block 2',
      composition: [{ platform_ref: 'coyote-b2', quantity: 12 }],
      notes: 'Baseline magazine — Ukraine exchange-ratio reference',
    },
    {
      label: 'Option B: 18× Coyote Block 2',
      composition: [{ platform_ref: 'coyote-b2', quantity: 18 }],
      notes: 'Magazine uplift for decoy discrimination load',
    },
  ],
}

function trainingRunOutcomes(question: ForceDesignQuestion): RunOutcome[] {
  const outcomes: RunOutcome[] = []
  const perOpt = Math.max(1, Math.floor(question.runs_requested / question.force_structure.length))
  for (const opt of question.force_structure) {
    const baseSuccess = opt.label.includes('18') ? 0.83 : 0.58
    for (let i = 0; i < perOpt; i++) {
      const roll = baseSuccess + (i % 3) * 0.05
      outcomes.push({
        option_label: opt.label,
        run_index: i,
        outcome: roll >= 0.75 ? 'force_succeeded' : roll >= 0.5 ? 'marginal' : 'force_failed',
        resources_expended: { interceptors: opt.composition[0]?.quantity ?? 12 },
        failure_point: roll < 0.5 ? 'Magazine empty before final wave — decoy saturation' : null,
        is_placeholder: true,
      })
    }
  }
  return outcomes
}

export function getTrainingForceDesignReport(
  question: ForceDesignQuestion = TRAINING_FORCE_DESIGN_QUESTION,
): ForceDesignReport {
  const now = new Date().toISOString()
  return forceDesignEngine.analyse(question, trainingRunOutcomes(question), now)
}

const minimalForce = (): PCM.ForceOrbat => ({
  force_id: 'BLUE',
  comms_status: 'nominal',
  platforms_active: 1,
  platforms_destroyed: 0,
  magazine_expended: 4,
  magazine_remaining: 8,
  platforms: [],
  ew_assets: [],
  c2: {
    comms_status: 'nominal',
    gcs_location: 'D1',
    backup_gcs: null,
    link_health_percent: 72,
    primary_waveform: 'Link-16',
    backup_waveform: 'VHF',
  },
})

function demoWorldState(exerciseId: string, turn = 12): PCM.WorldState {
  return {
    exercise_id: exerciseId,
    scenario_id: 'training-scenario',
    turn,
    max_turns: 20,
    time_elapsed_minutes: turn * 15,
    time_of_day: 'morning',
    phase: 'contested',
    outcome: 'continues',
    terrain: {
      grid_datum: 'UTM',
      primary_feature: 'coastal',
      elevation_model: 'SRTM',
      urban_areas: [],
      choke_points: [],
      restricted_areas: [],
      sea_border: true,
      sea_state: 2,
    },
    weather: {
      visibility_km: 20,
      cloud_base_ft: 5000,
      wind_speed_kt: 5,
      wind_bearing_deg: 270,
      temperature_c: 18,
      precipitation: 'none',
      sea_state: 1,
      eo_ir_modifier: 1,
      radar_modifier: 1,
      rf_propagation_modifier: 1,
      fpv_flyable: true,
    },
    red_force: { ...minimalForce(), force_id: 'RED' },
    blue_force: minimalForce(),
    all_contacts: [],
    red_orders: null,
    blue_orders: null,
    inject_queue: [],
    injects_fired: [],
    objectives: [],
    created_at: '2026-06-16T00:00:00.000Z',
    updated_at: '2026-06-16T00:00:00.000Z',
    version: 1,
  }
}

function demoTurnRecords(exerciseId: string): PCM.TurnRecord[] {
  return Array.from({ length: 12 }, (_, i) => {
    const turn = i + 1
    const ws = demoWorldState(exerciseId, turn)
    return {
      turn,
      timestamp: '2026-06-16T00:15:00.000Z',
      red_orders: null,
      blue_orders: null,
      world_state_snapshot: ws,
      adjudication: {
        turn,
        exercise_id: exerciseId,
        events: [
          {
            event_id: `EVT-${turn}`,
            type: 'impact',
            description:
              turn === 9
                ? 'Blue magazine empty — layer=2'
                : 'Blue intercept Shahed-class OWA',
            affected_platform_ids: [],
            visible_to_red: true,
            visible_to_blue: true,
            visible_to_ds: true,
          },
        ],
        injects_fired: [],
        world_state_after: ws,
        red_sensor_picture: [],
        blue_sensor_picture: [],
        ds_briefing: '',
        blue_suggestion: null,
        outcome: 'continues',
        blue_win_probability: 0.55 + turn * 0.015,
        key_decision_this_turn: turn === 9,
      },
    }
  })
}

export function getTrainingAarDocument(exerciseId: string): AARDocument {
  const ws = demoWorldState(exerciseId, 12)
  return buildAARDocument(exerciseId, demoTurnRecords(exerciseId), ws)
}

export interface TrainingExerciseMeta {
  id: string
  scenario_id: string
  status: string
  current_turn: number
  training: true
}

/** PCM exercise metadata when DB session unavailable (demo / instructor walkthrough). */
export function getTrainingExerciseMeta(exerciseId: string): TrainingExerciseMeta {
  return {
    id: exerciseId,
    scenario_id: 'ukraine-owa-intercept-vignette',
    status: 'active',
    current_turn: 12,
    training: true,
  }
}
