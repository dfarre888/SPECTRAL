/**
 * SPECTRAL — Moat-Builder 1
 * Longitudinal Learner Model Engine
 *
 * Builds and maintains the per-commander competency record across a career.
 * Consumes turn observations (decisions, context, timing) and produces an
 * accreditation-grade competency picture, blind-spot detection, and measured
 * improvement evidence.
 *
 * Fully buildable now — no controlled logic. It reads what the trainee did;
 * it does not adjudicate combat.
 */

import {
  type SpectralCompetency,
  type CompetencyState,
  type CompetencyAssessment,
  type CompetencyEvidence,
  type BlindSpot,
  type LongitudinalCompetencyRecord,
  type CompetencySummary,
  type ImprovementHighlight,
  COMPETENCY_LIBRARY,
} from '@/lib/moat/learnerModel.types';

// ─────────────────────────────────────────────────────────────────────────────
// TURN OBSERVATION — the input to the learner model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single turn's worth of observed trainee behaviour.
 * This is produced by the (safe) profiling hooks in the REF orchestrator —
 * it describes what the trainee DID, not what the combat engine resolved.
 */
export interface TurnObservation {
  exercise_id: string;
  turn: number;
  timestamp: string;
  decision_time_sec: number | null;
  context_flags: string[];           // e.g. ["under_ew", "saturation", "night"]
  // Per-competency behavioural observations for this turn
  behaviours: ObservedBehaviour[];
}

export interface ObservedBehaviour {
  competency: SpectralCompetency;
  behaviour: string;                 // which observable behaviour from the library
  met_standard: boolean;
  context: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class LearnerModelEngine {

  // ── INGEST A TURN ──────────────────────────────────────────────────────────

  /**
   * ingestTurn
   * Updates the longitudinal record with one turn's observations.
   * Idempotent per (exercise, turn) — safe to replay.
   */
  ingestTurn(
    record: LongitudinalCompetencyRecord,
    observation: TurnObservation,
  ): LongitudinalCompetencyRecord {
    const updated = structuredClone(record);
    updated.total_turns += 1;
    updated.most_recent_exercise_at = observation.timestamp;

    // Update decision-speed profile
    this.updateDecisionSpeed(updated, observation);

    // Record evidence against each competency
    for (const b of observation.behaviours) {
      this.recordEvidence(updated, b, observation);
    }

    // Re-derive competency states from accumulated evidence
    for (const comp of Object.keys(updated.competencies) as SpectralCompetency[]) {
      updated.competencies[comp] = this.deriveAssessment(updated.competencies[comp]);
    }

    // Detect / update blind spots
    this.updateBlindSpots(updated, observation);

    // Re-derive overall level and summary
    updated.overall_level = this.deriveOverallLevel(updated);
    updated.competency_summary = this.buildSummary(record, updated);
    updated.updated_at = observation.timestamp;

    return updated;
  }

  // ── FINALISE AN EXERCISE ───────────────────────────────────────────────────

  /**
   * finaliseExercise
   * Called at end of exercise. Increments exercise count, recomputes trends
   * and improvement highlights against the record state at exercise start.
   */
  finaliseExercise(
    recordAtStart: LongitudinalCompetencyRecord,
    currentRecord: LongitudinalCompetencyRecord,
    exerciseId: string,
  ): LongitudinalCompetencyRecord {
    const updated = structuredClone(currentRecord);
    updated.total_exercises += 1;

    // Compute improvement highlights vs start-of-exercise snapshot
    updated.competency_summary.improvement_highlights =
      this.computeImprovements(recordAtStart, updated, exerciseId);

    updated.competency_summary.narrative = this.buildNarrative(updated);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVIDENCE & ASSESSMENT
  // ─────────────────────────────────────────────────────────────────────────

  private recordEvidence(
    record: LongitudinalCompetencyRecord,
    behaviour: ObservedBehaviour,
    observation: TurnObservation,
  ): void {
    const assessment = record.competencies[behaviour.competency];

    const evidence: CompetencyEvidence = {
      exercise_id: observation.exercise_id,
      turn: observation.turn,
      timestamp: observation.timestamp,
      behaviour_observed: behaviour.behaviour,
      met_standard: behaviour.met_standard,
      context: behaviour.context,
      decision_time_sec: observation.decision_time_sec,
      notes: '',
    };

    assessment.evidence_trail.push(evidence);
    assessment.evidence_count += 1;
    if (behaviour.met_standard) assessment.positive_evidence += 1;
    else assessment.negative_evidence += 1;
    assessment.last_assessed_exercise_id = observation.exercise_id;
    assessment.last_assessed_at = observation.timestamp;
  }

  /**
   * deriveAssessment
   * Translates accumulated evidence into a competency state using a
   * transparent, defensible rule set (not a black box — this is an
   * accreditation artifact and must be explainable).
   */
  private deriveAssessment(assessment: CompetencyAssessment): CompetencyAssessment {
    const updated = { ...assessment };
    const { evidence_count, positive_evidence } = updated;

    if (evidence_count < 3) {
      updated.state = 'not_yet_assessed';
    } else {
      const ratio = positive_evidence / evidence_count;
      // Proficiency requires consistent success UNDER DEGRADED CONDITIONS
      const degradedSuccess = this.countDegradedSuccesses(updated);
      const degradedTotal = this.countDegradedInstances(updated);

      if (ratio >= 0.85 && degradedTotal >= 3 && (degradedSuccess / degradedTotal) >= 0.8) {
        updated.state = 'proficient';
      } else if (ratio >= 0.75) {
        updated.state = 'competent';
      } else {
        updated.state = 'developing';
      }
    }

    updated.trend = this.computeTrend(updated);
    return updated;
  }

  private countDegradedInstances(a: CompetencyAssessment): number {
    return a.evidence_trail.filter(e =>
      /ew|saturation|night|degraded|severed|jam/i.test(e.context),
    ).length;
  }

  private countDegradedSuccesses(a: CompetencyAssessment): number {
    return a.evidence_trail.filter(e =>
      /ew|saturation|night|degraded|severed|jam/i.test(e.context) && e.met_standard,
    ).length;
  }

  private computeTrend(a: CompetencyAssessment): CompetencyAssessment['trend'] {
    const trail = a.evidence_trail;
    if (trail.length < 6) return 'insufficient_data';

    const half = Math.floor(trail.length / 2);
    const firstHalf = trail.slice(0, half);
    const secondHalf = trail.slice(half);

    const firstRate = firstHalf.filter(e => e.met_standard).length / firstHalf.length;
    const secondRate = secondHalf.filter(e => e.met_standard).length / secondHalf.length;

    const delta = secondRate - firstRate;
    if (delta > 0.15) return 'improving';
    if (delta < -0.15) return 'declining';
    return 'stable';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BLIND SPOT DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * updateBlindSpots
   * A blind spot is a competency that is failing repeatedly under specific
   * conditions, across more than one session. This is the heart of the
   * differentiator — persistent, condition-specific weakness detection.
   */
  private updateBlindSpots(
    record: LongitudinalCompetencyRecord,
    observation: TurnObservation,
  ): void {
    for (const b of observation.behaviours) {
      if (b.met_standard) {
        // success — may resolve an active blind spot
        this.maybeResolveBlindSpot(record, b.competency, observation);
        continue;
      }

      // failure — does it constitute or extend a blind spot?
      const assessment = record.competencies[b.competency];
      const recentFailures = assessment.evidence_trail
        .slice(-6)
        .filter(e => !e.met_standard);

      // Threshold: 3+ failures in the recent window
      if (recentFailures.length < 3) continue;

      const triggerConditions = this.extractTriggers(observation.context_flags);
      const existing = record.blind_spots.find(
        bs => bs.competency === b.competency && bs.status !== 'resolved',
      );

      if (existing) {
        // Extend existing blind spot
        if (!existing.sessions_observed.includes(observation.exercise_id)) {
          existing.sessions_observed.push(observation.exercise_id);
          existing.recurrence_count += 1;
        }
        existing.trigger_conditions = Array.from(
          new Set([...existing.trigger_conditions, ...triggerConditions]),
        );
        existing.severity = this.computeSeverity(existing.recurrence_count, recentFailures.length, b.competency);
      } else {
        // New blind spot
        record.blind_spots.push({
          id: `BS-${b.competency}-${Date.now()}`,
          competency: b.competency,
          description: this.describeBlindSpot(b.competency, triggerConditions),
          first_observed_exercise_id: observation.exercise_id,
          first_observed_at: observation.timestamp,
          recurrence_count: 1,
          sessions_observed: [observation.exercise_id],
          severity: this.computeSeverity(1, recentFailures.length, b.competency),
          curriculum_module_assigned: null,
          status: 'active',
          resolution_evidence: null,
          trigger_conditions: triggerConditions,
        });
      }
    }
  }

  private maybeResolveBlindSpot(
    record: LongitudinalCompetencyRecord,
    competency: SpectralCompetency,
    observation: TurnObservation,
  ): void {
    const active = record.blind_spots.find(
      bs => bs.competency === competency && bs.status !== 'resolved',
    );
    if (!active) return;

    const assessment = record.competencies[competency];
    const recent = assessment.evidence_trail.slice(-5);
    const recentSuccessRate = recent.filter(e => e.met_standard).length / Math.max(1, recent.length);

    if (recentSuccessRate >= 0.8 && recent.length >= 4) {
      active.status = 'resolved';
      active.resolution_evidence =
        `Recovered to ${Math.round(recentSuccessRate * 100)}% success over last ${recent.length} instances (resolved at ${observation.exercise_id}).`;
    } else if (recentSuccessRate >= 0.6) {
      active.status = 'improving';
    }
  }

  private extractTriggers(contextFlags: string[]): string[] {
    const known = ['under_ew', 'saturation', 'night', 'degraded_comms', 'arm_threat', 'decoy_heavy'];
    return contextFlags.filter(f => known.includes(f));
  }

  private computeSeverity(
    recurrence: number,
    recentFailureCount: number,
    competency: SpectralCompetency,
  ): BlindSpot['severity'] {
    // Some competencies are safety/mission critical — weight them up
    const critical: SpectralCompetency[] = ['roe_application', 'threat_classification', 'emcon_discipline'];
    const isCritical = critical.includes(competency);

    // Intensity = how badly it's failing right now (within-session), combined
    // with recurrence across sessions. A critical competency failing repeatedly
    // within a single session is already critical — you don't wait for it to
    // recur across sessions before flagging an ROE breach pattern.
    const intensity = recurrence + Math.max(0, recentFailureCount - 3); // 3 is the trigger threshold

    if (isCritical) {
      if (intensity >= 1 && recentFailureCount >= 4) return 'critical';
      if (recurrence >= 2) return 'critical';
      return 'high';
    }

    if (recurrence >= 4) return 'critical';
    if (recurrence >= 3) return 'high';
    if (recurrence >= 2) return 'moderate';
    return 'low';
  }

  private describeBlindSpot(competency: SpectralCompetency, triggers: string[]): string {
    const lib = COMPETENCY_LIBRARY[competency];
    const condition = triggers.length ? ` under ${triggers.join(', ').replace(/_/g, ' ')}` : '';
    return `Recurring weakness in ${lib.title.toLowerCase()}${condition}.`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DECISION SPEED
  // ─────────────────────────────────────────────────────────────────────────

  private updateDecisionSpeed(
    record: LongitudinalCompetencyRecord,
    observation: TurnObservation,
  ): void {
    if (observation.decision_time_sec === null) return;
    const t = observation.decision_time_sec;
    const p = record.decision_speed_profile;
    const flags = observation.context_flags;

    const blend = (cur: number | null, sample: number) =>
      cur === null ? sample : Math.round(cur * 0.8 + sample * 0.2);

    if (flags.includes('under_ew')) p.under_ew_sec = blend(p.under_ew_sec, t);
    else if (flags.includes('saturation')) p.under_saturation_sec = blend(p.under_saturation_sec, t);
    else if (flags.includes('night')) p.at_night_sec = blend(p.at_night_sec, t);
    else p.baseline_sec = blend(p.baseline_sec, t);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OVERALL LEVEL & SUMMARY
  // ─────────────────────────────────────────────────────────────────────────

  private deriveOverallLevel(
    record: LongitudinalCompetencyRecord,
  ): LongitudinalCompetencyRecord['overall_level'] {
    const states = Object.values(record.competencies).map(c => c.state);
    const proficient = states.filter(s => s === 'proficient').length;
    const competent = states.filter(s => s === 'competent' || s === 'proficient').length;
    const total = states.length;
    const activeCritical = record.blind_spots.filter(
      b => b.status === 'active' && b.severity === 'critical',
    ).length;

    if (activeCritical > 0) return record.total_exercises > 0 ? 'trainee' : 'trainee';
    if (proficient >= total * 0.7) return 'expert';
    if (competent >= total * 0.8) return 'experienced';
    if (competent >= total * 0.5) return 'qualified';
    return 'trainee';
  }

  private buildSummary(
    _prev: LongitudinalCompetencyRecord,
    record: LongitudinalCompetencyRecord,
  ): CompetencySummary {
    const states = Object.values(record.competencies).map(c => c.state);
    return {
      competent_count: states.filter(s => s === 'competent' || s === 'proficient').length,
      proficient_count: states.filter(s => s === 'proficient').length,
      developing_count: states.filter(s => s === 'developing').length,
      active_blind_spots: record.blind_spots.filter(b => b.status === 'active').length,
      resolved_blind_spots: record.blind_spots.filter(b => b.status === 'resolved').length,
      narrative: record.competency_summary?.narrative ?? '',
      improvement_highlights: record.competency_summary?.improvement_highlights ?? [],
    };
  }

  private computeImprovements(
    start: LongitudinalCompetencyRecord,
    end: LongitudinalCompetencyRecord,
    _exerciseId: string,
  ): ImprovementHighlight[] {
    const order: CompetencyState[] = ['not_yet_assessed', 'developing', 'competent', 'proficient'];
    const highlights: ImprovementHighlight[] = [];

    for (const comp of Object.keys(end.competencies) as SpectralCompetency[]) {
      const from = start.competencies[comp]?.state ?? 'not_yet_assessed';
      const to = end.competencies[comp].state;
      if (order.indexOf(to) > order.indexOf(from)) {
        const a = end.competencies[comp];
        highlights.push({
          competency: comp,
          from_state: from,
          to_state: to,
          period_start: start.most_recent_exercise_at,
          period_end: end.most_recent_exercise_at,
          evidence: `${COMPETENCY_LIBRARY[comp].title}: ${a.positive_evidence}/${a.evidence_count} to standard.`,
        });
      }
    }
    return highlights;
  }

  private buildNarrative(record: LongitudinalCompetencyRecord): string {
    const s = record.competency_summary;
    const parts: string[] = [];
    parts.push(`${record.callsign}: ${record.overall_level.toUpperCase()} across ${record.total_exercises} exercises.`);
    parts.push(`${s.competent_count} of ${Object.keys(record.competencies).length} competencies at standard (${s.proficient_count} proficient under degraded conditions).`);

    const active = record.blind_spots.filter(b => b.status === 'active');
    if (active.length) {
      parts.push(`Active development areas: ${active.map(b => COMPETENCY_LIBRARY[b.competency].title).join(', ')}.`);
    }
    const resolved = record.blind_spots.filter(b => b.status === 'resolved');
    if (resolved.length) {
      parts.push(`Trained out: ${resolved.map(b => COMPETENCY_LIBRARY[b.competency].title).join(', ')}.`);
    }
    return parts.join(' ');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FACTORY
  // ─────────────────────────────────────────────────────────────────────────

  createEmptyRecord(playerId: string, callsign: string, now: string): LongitudinalCompetencyRecord {
    const competencies = {} as LongitudinalCompetencyRecord['competencies'];
    for (const comp of Object.keys(COMPETENCY_LIBRARY) as SpectralCompetency[]) {
      competencies[comp] = {
        competency: comp,
        state: 'not_yet_assessed',
        evidence_count: 0,
        positive_evidence: 0,
        negative_evidence: 0,
        last_assessed_exercise_id: '',
        last_assessed_at: now,
        trend: 'insufficient_data',
        evidence_trail: [],
      };
    }
    return {
      player_id: playerId,
      callsign,
      competencies,
      blind_spots: [],
      total_exercises: 0,
      total_turns: 0,
      first_exercise_at: now,
      most_recent_exercise_at: now,
      decision_speed_profile: {
        baseline_sec: null, under_ew_sec: null,
        under_saturation_sec: null, at_night_sec: null,
      },
      overall_level: 'trainee',
      competency_summary: {
        competent_count: 0, proficient_count: 0, developing_count: 0,
        active_blind_spots: 0, resolved_blind_spots: 0,
        narrative: '', improvement_highlights: [],
      },
      created_at: now,
      updated_at: now,
    };
  }
}

export const learnerModelEngine = new LearnerModelEngine();
