/**
 * SPECTRAL — Moat-Builder Test Suite
 * Run: npx vitest run src/tests/moat.test.ts
 *
 * Proves the buildable differentiators work end-to-end against safe inputs.
 * No controlled logic is exercised — these tests run entirely in the open build.
 */

import { describe, it, expect } from 'vitest';
import { LearnerModelEngine, type TurnObservation } from '@/lib/moat/learnerModelEngine';
import { CurriculumEngine } from '@/lib/moat/curriculumEngine';
import { CurrencyEngine, SEED_CURRENCY_UPDATES, type CurrencyUpdate } from '@/lib/moat/currencyEngine';
import { ForceDesignEngine, type ForceDesignQuestion, type RunOutcome } from '@/lib/moat/forceDesignEngine';
import { assertResidency, DEFAULT_SOVEREIGN_POLICY, SOVEREIGN_PLATFORM_CATALOGUE, openBuildPerformanceResolver } from '@/lib/moat/sovereignData';
import { makeOpenBuildAdapter, InteropRegistry, type AdversaryIntent } from '@/lib/moat/interopLayer';

const NOW = '2026-06-14T00:00:00Z';

// ── Helpers ──────────────────────────────────────────────────────
function obs(turn: number, competency: string, met: boolean, context: string, flags: string[] = [], time = 30): TurnObservation {
  return {
    exercise_id: 'EX-001',
    turn,
    timestamp: NOW,
    decision_time_sec: time,
    context_flags: flags,
    behaviours: [{ competency: competency as any, behaviour: 'test behaviour', met_standard: met, context }],
  };
}

// ─────────────────────────────────────────────────────────────────
describe('Learner Model — competency progression', () => {
  const engine = new LearnerModelEngine();

  it('starts every competency as not_yet_assessed', () => {
    const rec = engine.createEmptyRecord('P1', 'VIPER', NOW);
    expect(rec.competencies.magazine_management.state).toBe('not_yet_assessed');
    expect(rec.overall_level).toBe('trainee');
  });

  it('moves a competency to competent after consistent success', () => {
    let rec = engine.createEmptyRecord('P1', 'VIPER', NOW);
    for (let t = 1; t <= 5; t++) {
      rec = engine.ingestTurn(rec, obs(t, 'magazine_management', true, 'saturation attack', ['saturation']));
    }
    expect(['competent', 'proficient']).toContain(rec.competencies.magazine_management.state);
  });

  it('keeps a competency developing when failures dominate', () => {
    let rec = engine.createEmptyRecord('P1', 'VIPER', NOW);
    for (let t = 1; t <= 5; t++) {
      const met = t === 1; // mostly failures
      rec = engine.ingestTurn(rec, obs(t, 'threat_classification', met, 'decoy heavy', ['decoy_heavy']));
    }
    expect(rec.competencies.threat_classification.state).toBe('developing');
  });

  it('requires degraded-condition success for proficiency', () => {
    let rec = engine.createEmptyRecord('P1', 'VIPER', NOW);
    // all success but all in benign conditions → competent, not proficient
    for (let t = 1; t <= 6; t++) {
      rec = engine.ingestTurn(rec, obs(t, 'sensor_employment', true, 'clear conditions', []));
    }
    expect(rec.competencies.sensor_employment.state).toBe('competent');
  });
});

describe('Learner Model — blind spot detection', () => {
  const engine = new LearnerModelEngine();

  it('detects a blind spot after repeated failures under a condition', () => {
    let rec = engine.createEmptyRecord('P1', 'VIPER', NOW);
    for (let t = 1; t <= 4; t++) {
      rec = engine.ingestTurn(rec, obs(t, 'decision_under_uncertainty', false, 'under EW low confidence', ['under_ew']));
    }
    const bs = rec.blind_spots.find(b => b.competency === 'decision_under_uncertainty');
    expect(bs).toBeDefined();
    expect(bs?.trigger_conditions).toContain('under_ew');
    expect(bs?.status).toBe('active');
  });

  it('escalates severity for critical competencies', () => {
    let rec = engine.createEmptyRecord('P1', 'VIPER', NOW);
    for (let t = 1; t <= 4; t++) {
      rec = engine.ingestTurn(rec, obs(t, 'roe_application', false, 'ROE change under pressure', ['degraded_comms']));
    }
    const bs = rec.blind_spots.find(b => b.competency === 'roe_application');
    expect(bs?.severity).toBe('critical');
  });

  it('resolves a blind spot after sustained recovery', () => {
    let rec = engine.createEmptyRecord('P1', 'VIPER', NOW);
    // create the blind spot
    for (let t = 1; t <= 4; t++) {
      rec = engine.ingestTurn(rec, obs(t, 'magazine_management', false, 'saturation', ['saturation']));
    }
    expect(rec.blind_spots.find(b => b.competency === 'magazine_management')?.status).toBe('active');
    // recover
    for (let t = 5; t <= 9; t++) {
      rec = engine.ingestTurn(rec, obs(t, 'magazine_management', true, 'saturation', ['saturation']));
    }
    expect(rec.blind_spots.find(b => b.competency === 'magazine_management')?.status).toBe('resolved');
  });
});

describe('Curriculum Engine — closed loop', () => {
  const learner = new LearnerModelEngine();
  const curriculum = new CurriculumEngine();

  it('generates a training assignment for an active blind spot', () => {
    let rec = learner.createEmptyRecord('P1', 'VIPER', NOW);
    for (let t = 1; t <= 4; t++) {
      rec = learner.ingestTurn(rec, obs(t, 'magazine_management', false, 'saturation', ['saturation']));
    }
    const plan = curriculum.generateTrainingPlan(rec, NOW);
    expect(plan.assignments.length).toBeGreaterThan(0);
    const a = plan.assignments[0];
    expect(a.competency).toBe('magazine_management');
    expect(a.module.target_competency).toBe('magazine_management');
    expect(a.module.mastery_criteria).toBeTruthy();
  });

  it('produces no assignments when there are no active blind spots', () => {
    const rec = learner.createEmptyRecord('P2', 'EAGLE', NOW);
    const plan = curriculum.generateTrainingPlan(rec, NOW);
    expect(plan.assignments.length).toBe(0);
    expect(plan.instructor_brief).toContain('no active development areas');
  });

  it('prioritises critical blind spots first', () => {
    let rec = learner.createEmptyRecord('P1', 'VIPER', NOW);
    // critical: roe; moderate: tempo
    for (let t = 1; t <= 4; t++) rec = learner.ingestTurn(rec, obs(t, 'roe_application', false, 'roe', ['degraded_comms']));
    for (let t = 5; t <= 7; t++) rec = learner.ingestTurn(rec, obs(t, 'tempo_and_initiative', false, 'reactive', []));
    const plan = curriculum.generateTrainingPlan(rec, NOW);
    expect(plan.assignments[0].competency).toBe('roe_application');
    expect(plan.assignments[0].priority).toBe(1);
  });
});

describe('Currency Engine — human-gated updates', () => {
  const engine = new CurrencyEngine();

  it('marks performance-data updates as requiring accreditation', () => {
    const u = engine.proposeUpdate({
      type: 'new_threat_platform',
      title: 'New OWA variant',
      summary: 'A new threat',
      source_type: 'osint',
      source_reference: 'ref',
      detected_at: NOW,
      proposed_effect: 'Add platform with new range table and probability of kill',
      affects: { competencies: [], scenarios: [], injects: [] },
    });
    expect(u.requires_accredited_implementation).toBe(true);
  });

  it('allows pedagogy-only updates into the open build after approval', () => {
    const u = engine.proposeUpdate({
      type: 'new_tactic',
      title: 'Fibre-optic FPV',
      summary: 'EW-immune threat',
      source_type: 'osint',
      source_reference: 'ref',
      detected_at: NOW,
      proposed_effect: 'Add training emphasis: recognise EW-immune threat. Pedagogy only.',
      affects: { competencies: ['adaptation'], scenarios: [], injects: ['RED-003'] },
    });
    expect(u.requires_accredited_implementation).toBe(false);
    const approved = engine.review(u, 'approved', 'SME-1', 'Valid', NOW);
    const publishable = engine.getPublishable([approved]);
    expect(publishable.length).toBe(1);
  });

  it('never auto-publishes — proposed updates are not publishable', () => {
    const u = engine.proposeUpdate({
      type: 'new_tactic', title: 'x', summary: 'y', source_type: 'osint',
      source_reference: 'r', detected_at: NOW, proposed_effect: 'pedagogy only',
      affects: { competencies: [], scenarios: [], injects: [] },
    });
    expect(engine.getPublishable([u]).length).toBe(0); // not yet reviewed
  });

  it('seed updates are well-formed', () => {
    expect(SEED_CURRENCY_UPDATES.length).toBeGreaterThan(0);
    expect(SEED_CURRENCY_UPDATES[0].title).toBeTruthy();
  });
});

describe('Force-Design Engine — analytic output', () => {
  const engine = new ForceDesignEngine();

  const question: ForceDesignQuestion = {
    id: 'FD-001',
    question: 'Is a 12-interceptor battery sufficient vs decoy-heavy saturation?',
    force_structure: [
      { label: 'Option A: 12 interceptors', composition: [{ platform_ref: 'CUAS', quantity: 12 }], notes: '' },
      { label: 'Option B: 24 interceptors', composition: [{ platform_ref: 'CUAS', quantity: 24 }], notes: '' },
    ],
    threat_profile: 'decoy-heavy OWA saturation',
    success_criterion: 'node survives',
    runs_requested: 30,
  };

  it('produces a placeholder report in the open build (no run data)', () => {
    const report = engine.analyse(question, [], NOW);
    expect(report.data_provenance).toBe('open_build_placeholder');
    expect(report.recommendation).toContain('OPEN BUILD');
    expect(report.caveats[0]).toContain('PLACEHOLDER');
  });

  it('aggregates real run outcomes into findings', () => {
    const outcomes: RunOutcome[] = [];
    // Option A: 40% success
    for (let i = 0; i < 10; i++) outcomes.push({ option_label: 'Option A: 12 interceptors', run_index: i, outcome: i < 4 ? 'force_succeeded' : 'force_failed', resources_expended: { interceptors: 12 }, failure_point: i < 4 ? null : 'magazine exhausted', is_placeholder: false });
    // Option B: 90% success
    for (let i = 0; i < 10; i++) outcomes.push({ option_label: 'Option B: 24 interceptors', run_index: i, outcome: i < 9 ? 'force_succeeded' : 'force_failed', resources_expended: { interceptors: 22 }, failure_point: i < 9 ? null : 'magazine exhausted', is_placeholder: false });

    const report = engine.analyse(question, outcomes, NOW);
    expect(report.data_provenance).toBe('accredited_engine');
    const a = report.findings.find(f => f.option_label.includes('Option A'))!;
    const b = report.findings.find(f => f.option_label.includes('Option B'))!;
    expect(a.success_rate).toBeCloseTo(0.4, 1);
    expect(b.success_rate).toBeCloseTo(0.9, 1);
    expect(report.recommendation).toContain('Option B');
    expect(a.common_failure_points[0].point).toBe('magazine exhausted');
  });
});

describe('Sovereign Data — residency & catalogue', () => {
  it('permits sovereign regions', () => {
    expect(() => assertResidency('ap-southeast-2')).not.toThrow();
    expect(() => assertResidency('ap-southeast-4')).not.toThrow();
  });

  it('blocks non-sovereign regions', () => {
    expect(() => assertResidency('us-east-1')).toThrow(/SOVEREIGN POLICY VIOLATION/);
    expect(() => assertResidency('eu-west-1')).toThrow();
  });

  it('catalogue contains Australian sovereign platforms with no controlled performance data', () => {
    expect(SOVEREIGN_PLATFORM_CATALOGUE.length).toBeGreaterThan(0);
    for (const p of SOVEREIGN_PLATFORM_CATALOGUE) {
      expect(p.performance_ref).toBe('SOVEREIGN_CORE_BOUNDARY');
    }
    expect(SOVEREIGN_PLATFORM_CATALOGUE.find(p => p.display_name.includes('Ghost Bat'))).toBeDefined();
  });

  it('open-build performance resolver returns the boundary marker, not data', () => {
    const perf = openBuildPerformanceResolver.resolvePerformance('AUS-CCA-GHOSTBAT');
    expect(perf.resolved).toBe(false);
    expect(perf.note).toContain('accredited');
  });

  it('default sovereign policy forbids offshore processing', () => {
    expect(DEFAULT_SOVEREIGN_POLICY.offshore_processing_permitted).toBe(false);
    expect(DEFAULT_SOVEREIGN_POLICY.inference_location).toBe('sovereign_only');
  });
});

describe('Interop Layer — intent not effect', () => {
  it('open-build adapter accepts adversary INTENT without resolving effect', async () => {
    const adapter = makeOpenBuildAdapter('AFSIM', 'spectral_as_brain');
    const intent: AdversaryIntent = {
      exercise_id: 'EX-001', turn: 5,
      objective: 'deplete interceptor magazine',
      approach: 'decoy-heavy saturation from eastern axis',
      pedagogical_rationale: 'trainee weak on magazine discipline',
      targets_competency: 'magazine_management',
      composition_summary: 'mixed real/decoy OWA, high decoy ratio',
      platform_refs: ['THREAT-OWA', 'THREAT-DECOY'],
    };
    const ack = await adapter.pushAdversaryIntent(intent);
    expect(ack.accepted).toBe(true);
    expect(ack.message).toContain('validated engagement physics');
  });

  it('registry registers and lists adapters', () => {
    const reg = new InteropRegistry();
    reg.register(makeOpenBuildAdapter('AFSIM', 'spectral_as_brain'));
    reg.register(makeOpenBuildAdapter('VBS4', 'spectral_as_coach'));
    expect(reg.list()).toContain('AFSIM');
    expect(reg.list()).toContain('VBS4');
  });
});
