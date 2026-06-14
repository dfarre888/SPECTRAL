/**
 * SPECTRAL — Moat-Builder (Curriculum Feedback Loop)
 *
 * Turns the learner model's blind spots into targeted training: scenario
 * recommendations, condition-specific drills, and a measurable training plan.
 * This is the loop no competitor closes — the system teaches what THIS
 * commander keeps getting wrong, then proves it trained the weakness out.
 *
 * Buildable now — pure pedagogy. No controlled logic.
 */

import {
  type SpectralCompetency,
  type BlindSpot,
  type LongitudinalCompetencyRecord,
  COMPETENCY_LIBRARY,
} from '@/lib/moat/learnerModel.types';

// ─────────────────────────────────────────────────────────────────────────────
// CURRICULUM MODULE LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

export interface CurriculumModule {
  id: string;
  title: string;
  target_competency: SpectralCompetency;
  description: string;
  // Conditions this module deliberately exercises
  trains_under: string[];
  // Recommended scenario / inject configuration to exercise it
  scenario_emphasis: string;
  recommended_injects: string[];
  // What "success" looks like
  mastery_criteria: string;
}

export const CURRICULUM_LIBRARY: CurriculumModule[] = [
  {
    id: 'MOD-MAG-01',
    title: 'Magazine Discipline Under Saturation',
    target_competency: 'magazine_management',
    description: 'Drills interceptor economy against mixed real/decoy saturation attack.',
    trains_under: ['saturation', 'decoy_heavy'],
    scenario_emphasis: 'High decoy ratio OWA packages; finite interceptor magazine.',
    recommended_injects: ['RED-001', 'RED-004', 'BLUE-003'],
    mastery_criteria: 'Reserves interceptors for confirmed threats; articulates release trigger; ≥80% of confirmed OWA engaged with ≤20% magazine wasted on decoys, across 3 sessions.',
  },
  {
    id: 'MOD-CLASS-01',
    title: 'Threat Classification and Decoy Discrimination',
    target_competency: 'threat_classification',
    description: 'Drills real/decoy/civilian discrimination under time pressure.',
    trains_under: ['decoy_heavy', 'saturation'],
    scenario_emphasis: 'Mixed packages with high decoy fraction; ISR available for confirmation.',
    recommended_injects: ['RED-004', 'RED-001'],
    mastery_criteria: 'Seeks confirmation before committing; correctly discriminates ≥75% across 3 sessions.',
  },
  {
    id: 'MOD-DUU-01',
    title: 'Decision Under Uncertainty — Low-Confidence Contacts',
    target_competency: 'decision_under_uncertainty',
    description: 'Drills correct action on low-confidence contacts where dismissal is fatal.',
    trains_under: ['under_ew', 'night'],
    scenario_emphasis: 'Low-altitude OWA under EW and weather producing low-confidence detections.',
    recommended_injects: ['RED-002', 'ENV-003'],
    mastery_criteria: 'Acts appropriately on low-confidence contacts when cost of inaction is high; does not dismiss the fatal contact, across 3 sessions.',
  },
  {
    id: 'MOD-EMCON-01',
    title: 'EMCON Discipline and Anti-Radiation Threats',
    target_competency: 'emcon_discipline',
    description: 'Drills emissions control against anti-radiation threats.',
    trains_under: ['arm_threat'],
    scenario_emphasis: 'ARM threat against emitting sensors; passive options available.',
    recommended_injects: ['RED-007'],
    mastery_criteria: 'Limits emissions under ARM threat; preserves radar-emitting assets across 3 sessions.',
  },
  {
    id: 'MOD-ADAPT-01',
    title: 'Adaptation — Novel Threats',
    target_competency: 'adaptation',
    description: 'Drills recognition of and response to threats that defeat the current counter (e.g. fibre-optic FPV vs EW).',
    trains_under: ['under_ew'],
    scenario_emphasis: 'EW-immune threat introduced mid-exercise.',
    recommended_injects: ['RED-003'],
    mastery_criteria: 'Recognises defeated tactic; switches to effective counter within 2 turns, across 3 sessions.',
  },
  {
    id: 'MOD-ROE-01',
    title: 'ROE Application Under Pressure',
    target_competency: 'roe_application',
    description: 'Drills correct ROE application during mid-exercise changes.',
    trains_under: ['degraded_comms'],
    scenario_emphasis: 'ROE expansion and restriction injects; media/third-party presence.',
    recommended_injects: ['DOC-001', 'DOC-002', 'DOC-003', 'DOC-007'],
    mastery_criteria: 'Applies ROE changes correctly and promptly; no breaches across 3 sessions.',
  },
  {
    id: 'MOD-CONT-01',
    title: 'Contingency Planning — Degraded Operations',
    target_competency: 'contingency_planning',
    description: 'Drills pre-planning for comms / sensor / asset loss.',
    trains_under: ['degraded_comms'],
    scenario_emphasis: 'GCS comms loss, ISR asset loss mid-exercise.',
    recommended_injects: ['BLUE-001', 'BLUE-002', 'RED-002'],
    mastery_criteria: 'Demonstrates pre-planned contingency; maintains effectiveness through degradation across 3 sessions.',
  },
  {
    id: 'MOD-SENSOR-01',
    title: 'Sensor Employment and Confirmation',
    target_competency: 'sensor_employment',
    description: 'Drills correct sensor tasking and pre-confirmation.',
    trains_under: ['under_ew', 'night'],
    scenario_emphasis: 'Multi-sensor environment; degraded individual sensors.',
    recommended_injects: ['ENV-001', 'ENV-002', 'BLUE-001'],
    mastery_criteria: 'Cues appropriate sensor; confirms before acting across 3 sessions.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING PLAN
// ─────────────────────────────────────────────────────────────────────────────

export interface TrainingAssignment {
  priority: 1 | 2 | 3;
  blind_spot_id: string;
  competency: SpectralCompetency;
  module: CurriculumModule;
  rationale: string;
  // For the next exercise — how to configure it
  next_exercise_config: {
    emphasise_conditions: string[];
    recommended_injects: string[];
    difficulty_note: string;
  };
}

export interface TrainingPlan {
  player_id: string;
  callsign: string;
  generated_at: string;
  assignments: TrainingAssignment[];
  // Plain-language plan for the instructor
  instructor_brief: string;
  // The measurable goal
  success_definition: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRICULUM ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class CurriculumEngine {

  /**
   * generateTrainingPlan
   * Reads the learner record's active blind spots and produces a prioritised,
   * measurable training plan. This is the closed loop: weakness in → targeted
   * training out.
   */
  generateTrainingPlan(record: LongitudinalCompetencyRecord, now: string): TrainingPlan {
    const activeBlindSpots = record.blind_spots
      .filter(b => b.status === 'active' || b.status === 'improving')
      .sort((a, b) => this.severityRank(b.severity) - this.severityRank(a.severity));

    const assignments: TrainingAssignment[] = [];

    for (const bs of activeBlindSpots) {
      const module = this.selectModule(bs);
      if (!module) continue;

      assignments.push({
        priority: this.priorityFromSeverity(bs.severity),
        blind_spot_id: bs.id,
        competency: bs.competency,
        module,
        rationale: this.buildRationale(bs, record),
        next_exercise_config: {
          emphasise_conditions: bs.trigger_conditions.length
            ? bs.trigger_conditions
            : module.trains_under,
          recommended_injects: module.recommended_injects,
          difficulty_note: this.difficultyNote(bs, record),
        },
      });

      // Mark the module as assigned on the blind spot (caller persists this)
      bs.curriculum_module_assigned = module.id;
    }

    return {
      player_id: record.player_id,
      callsign: record.callsign,
      generated_at: now,
      assignments,
      instructor_brief: this.buildInstructorBrief(record, assignments),
      success_definition: this.buildSuccessDefinition(assignments),
    };
  }

  private selectModule(bs: BlindSpot): CurriculumModule | null {
    // Prefer a module whose trains_under overlaps the blind spot's triggers
    const candidates = CURRICULUM_LIBRARY.filter(m => m.target_competency === bs.competency);
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    const scored = candidates.map(m => ({
      m,
      overlap: m.trains_under.filter(c => bs.trigger_conditions.includes(c)).length,
    }));
    scored.sort((a, b) => b.overlap - a.overlap);
    return scored[0].m;
  }

  private buildRationale(bs: BlindSpot, record: LongitudinalCompetencyRecord): string {
    const lib = COMPETENCY_LIBRARY[bs.competency];
    const conditions = bs.trigger_conditions.length
      ? ` specifically under ${bs.trigger_conditions.join(', ').replace(/_/g, ' ')}`
      : '';
    return `${record.callsign} has shown a recurring weakness in ${lib.title.toLowerCase()}${conditions}, observed across ${bs.recurrence_count} session(s). Severity: ${bs.severity}. Targeted training is recommended before it becomes habitual.`;
  }

  private difficultyNote(bs: BlindSpot, _record: LongitudinalCompetencyRecord): string {
    if (bs.severity === 'critical') {
      return 'Start at reduced complexity to rebuild the fundamental, then reintroduce the trigger condition progressively.';
    }
    if (bs.status === 'improving') {
      return 'Maintain current complexity; the trend is positive. Confirm mastery under the trigger condition before advancing.';
    }
    return 'Hold difficulty; emphasise the trigger condition until consistent success is demonstrated.';
  }

  private buildInstructorBrief(
    record: LongitudinalCompetencyRecord,
    assignments: TrainingAssignment[],
  ): string {
    if (!assignments.length) {
      return `${record.callsign} has no active development areas requiring targeted training. Recommend progression to higher complexity or new scenario types to continue development.`;
    }
    const lines: string[] = [];
    lines.push(`Training focus for ${record.callsign} (${record.overall_level}):`);
    for (const a of assignments) {
      lines.push(`• [P${a.priority}] ${a.module.title} — ${a.rationale}`);
    }
    lines.push(`Configure the next exercise(s) to emphasise: ${Array.from(new Set(assignments.flatMap(a => a.next_exercise_config.emphasise_conditions))).join(', ').replace(/_/g, ' ')}.`);
    return lines.join('\n');
  }

  private buildSuccessDefinition(assignments: TrainingAssignment[]): string {
    if (!assignments.length) return 'No remediation outstanding.';
    return assignments
      .map(a => `${a.module.title}: ${a.module.mastery_criteria}`)
      .join(' ');
  }

  private severityRank(s: BlindSpot['severity']): number {
    return { low: 1, moderate: 2, high: 3, critical: 4 }[s];
  }

  private priorityFromSeverity(s: BlindSpot['severity']): 1 | 2 | 3 {
    if (s === 'critical' || s === 'high') return 1;
    if (s === 'moderate') return 2;
    return 3;
  }
}

export const curriculumEngine = new CurriculumEngine();
