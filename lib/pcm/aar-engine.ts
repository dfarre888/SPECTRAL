/**
 * SPECTRAL PCM — AAR engine (extends debrief-engine)
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { buildAAR, aarToText, type AARReport, type AARSection } from '@/lib/pcm/debrief-engine';
import type { PCM } from '@/lib/pcm/spectral.types';

export { buildAAR, aarToText, type AARReport, type AARSection };

export type AARGrade = 'unsatisfactory' | 'developing' | 'satisfactory' | 'commendable' | 'distinguished';

export interface AARDocument {
  exercise_id: string;
  report: AARReport;
  overall_grade: AARGrade;
  accreditation_eligible: boolean;
  competency_highlights: string[];
  generated_at: string;
}

export function gradeAARReport(report: AARReport): AARGrade {
  const win = report.blue_win_probability_final;
  const leaks = report.leaker_count_total;
  if (leaks >= 3 || win < 0.35) return 'unsatisfactory';
  if (leaks >= 2 || win < 0.45) return 'developing';
  if (leaks === 0 && win >= 0.7) return win >= 0.85 ? 'distinguished' : 'commendable';
  return 'satisfactory';
}

export function buildAARDocument(exerciseId: string, turnRecords: PCM.TurnRecord[], finalState: PCM.WorldState, now = new Date().toISOString()): AARDocument {
  const report = buildAAR(exerciseId, turnRecords, finalState);
  const overall_grade = gradeAARReport(report);
  const competency_highlights = report.sections.flatMap((s) => s.teaching_points).slice(0, 6);
  return {
    exercise_id: exerciseId,
    report,
    overall_grade,
    accreditation_eligible: overall_grade === 'commendable' || overall_grade === 'distinguished',
    competency_highlights,
    generated_at: now,
  };
}

export function finaliseExerciseAAR(exerciseId: string, turnRecords: PCM.TurnRecord[], finalState: PCM.WorldState): AARDocument {
  return buildAARDocument(exerciseId, turnRecords, finalState);
}


export function detectLowPdKeyDecision(turnRecords: PCM.TurnRecord[]): number[] {
  return turnRecords
    .filter((tr) => tr.adjudication.events.some((e) => /pd\s*<\s*0\.025|pd=0\.0?2/i.test(e.description)))
    .map((tr) => tr.turn);
}

export function evaluateAccreditationEligibility(report: AARReport, turnRecords: PCM.TurnRecord[]): boolean {
  if (report.total_turns < 15) return false;
  const competencies = new Set(report.sections.flatMap((s) => s.teaching_points));
  if (competencies.size < 6) return false;
  const observations = turnRecords.filter((t) => t.adjudication.key_decision_this_turn).length;
  const grade = gradeAARReport(report);
  return observations >= 3 && (grade === 'commendable' || grade === 'distinguished');
}
