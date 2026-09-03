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
import { assertResidency, DEFAULT_SOVEREIGN_POLICY, SOVEREIGN_PLATFORM_CATALOGUE, IADS_THREAT_CATALOGUE, openBuildPerformanceResolver, tag } from '@/lib/moat/sovereignData';
import { getActivePerformanceResolver } from '@/lib/moat/catalogue-performance-resolver';
import { MockAfsimAdapter } from '@/lib/moat/mock-afsim-adapter';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildContextFlags, buildTurnObservation, computeDecisionTimeSec } from '@/lib/moat/behaviourMapper';
import type { PCM } from '@/lib/pcm/spectral.types';
import { makeOpenBuildAdapter, InteropRegistry, type AdversaryIntent } from '@/lib/moat/interopLayer';
import { getSamProfile } from '@/lib/risk/sam-intercept';
import { RED_EFFECTORS } from '@/data/seed-effectors-red';

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

  it('produces a difficulty note for an improving blind spot with MOD-TEMPO-01', () => {
    let rec = learner.createEmptyRecord('P1', 'VIPER', NOW);
    for (let turn = 1; turn <= 3; turn++) {
      rec = learner.ingestTurn(rec, obs(turn, 'tempo_and_initiative', false, 'inbound reactive', []));
    }
    for (let turn = 4; turn <= 6; turn++) {
      rec = learner.ingestTurn(rec, obs(turn, 'tempo_and_initiative', true, 'inbound proactive', []));
    }
    const bs = rec.blind_spots.find((b) => b.competency === 'tempo_and_initiative');
    expect(bs?.status).toBe('improving');
    const plan = curriculum.generateTrainingPlan(rec, NOW);
    const assignment = plan.assignments.find((a) => a.competency === 'tempo_and_initiative');
    expect(assignment).toBeDefined();
    expect(assignment!.module.id).toBe('MOD-TEMPO-01');
    expect(assignment!.next_exercise_config.difficulty_note).toContain('positive');
  });

});

describe('Currency Engine — human-gated updates', () => {
  const engine = new CurrencyEngine();

  it('allows approved updates into the publishable set', () => {
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
  it('currencyReport tallies proposed and approved correctly', () => {
    const e = new CurrencyEngine();
    const base = {
      type: 'new_tactic' as const,
      title: 'Test update',
      summary: 'test',
      source_type: 'osint' as const,
      source_reference: 'ref',
      detected_at: NOW,
      proposed_effect: 'pedagogy only',
      affects: { competencies: [], scenarios: [], injects: [] },
    };
    const u1 = e.proposeUpdate(base);
    const u2 = e.proposeUpdate({ ...base, title: 'second' });
    const approved = e.review(u1, 'approved', 'SME-1', 'Valid', NOW);
    const report = e.currencyReport([approved, u2]);
    expect(report.total).toBe(2);
    expect(report.pending_review).toBe(1);
    expect(report.approved).toBe(1);
    expect(report.most_recent_approved).toBe(NOW);
  });

  it('superseded updates are not publishable', () => {
    const e = new CurrencyEngine();
    const u = e.proposeUpdate({
      type: 'doctrine_shift', title: 'old', summary: 's',
      source_type: 'osint', source_reference: 'r', detected_at: NOW,
      proposed_effect: 'pedagogy', affects: { competencies: [], scenarios: [], injects: [] },
    });
    const approved = e.review(u, 'approved', 'SME-1', 'ok', NOW);
    const superseded: CurrencyUpdate = { ...approved, status: 'superseded' };
    expect(e.getPublishable([superseded]).length).toBe(0);
  });

  it('seed updates can be hydrated into full proposals', () => {
    const e = new CurrencyEngine();
    for (const seed of SEED_CURRENCY_UPDATES) {
      expect(seed.title).toBeTruthy();
      expect(seed.source_type).toBeTruthy();
      expect(seed.proposed_effect).toMatch(/pedagogy|training emphasis|narrative change/i);
      const full = e.proposeUpdate({
        type: seed.type!,
        title: seed.title!,
        summary: seed.summary!,
        source_type: seed.source_type!,
        source_reference: seed.source_reference!,
        detected_at: seed.detected_at!,
        proposed_effect: seed.proposed_effect!,
        affects: seed.affects!,
      });
      expect(full.status).toBe('proposed');
    }
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
  it('accounts for marginal outcomes in the rate tally', () => {
    const e = new ForceDesignEngine();
    const q: ForceDesignQuestion = {
      id: 'FD-002',
      question: 'Is 6 interceptors enough?',
      force_structure: [{ label: 'Opt 6', composition: [{ platform_ref: 'CUAS', quantity: 6 }], notes: '' }],
      threat_profile: 'mixed',
      success_criterion: 'node survives',
      runs_requested: 10,
    };
    const outcomes: RunOutcome[] = [
      ...Array.from({ length: 4 }, (_, i) => ({ option_label: 'Opt 6', run_index: i, outcome: 'force_succeeded' as const, resources_expended: { interceptors: 6 }, failure_point: null, is_placeholder: false })),
      ...Array.from({ length: 3 }, (_, i) => ({ option_label: 'Opt 6', run_index: 4 + i, outcome: 'marginal' as const, resources_expended: { interceptors: 6 }, failure_point: null, is_placeholder: false })),
      ...Array.from({ length: 3 }, (_, i) => ({ option_label: 'Opt 6', run_index: 7 + i, outcome: 'force_failed' as const, resources_expended: { interceptors: 6 }, failure_point: 'magazine exhausted', is_placeholder: false })),
    ];
    const report = e.analyse(q, outcomes, NOW);
    const f = report.findings[0];
    expect(f.success_rate).toBeCloseTo(0.4, 1);
    expect(f.marginal_rate).toBeCloseTo(0.3, 1);
    expect(f.failure_rate).toBeCloseTo(0.3, 1);
    expect(f.success_rate + f.marginal_rate + f.failure_rate).toBeCloseTo(1.0, 5);
  });

  it('confidence note differs for high run counts', () => {
    const e = new ForceDesignEngine();
    const q: ForceDesignQuestion = {
      id: 'FD-003', question: 'x',
      force_structure: [{ label: 'Opt A', composition: [], notes: '' }],
      threat_profile: 'standard', success_criterion: 'survive', runs_requested: 30,
    };
    const outcomes: RunOutcome[] = Array.from({ length: 30 }, (_, i) => ({
      option_label: 'Opt A', run_index: i, outcome: 'force_succeeded' as const,
      resources_expended: {}, failure_point: null, is_placeholder: false,
    }));
    const report = e.analyse(q, outcomes, NOW);
    expect(report.findings[0].confidence_note).toContain('adequate');
    expect(report.findings[0].confidence_note).not.toContain('Indicative only');
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
  it('getActivePerformanceResolver returns open-build resolver without accredited flag', () => {
    delete process.env.SPECTRAL_ACCREDITED_RESOLVER;
    const resolver = getActivePerformanceResolver();
    const perf = resolver.resolvePerformance('AUS-CCA-GHOSTBAT');
    expect(perf.resolved).toBe(false);
    expect(perf.note).toContain('accredited');
  });

  it('tag() produces a ClassifiedRecord with correct fields', () => {
    const record = tag({ value: 42 }, 'UNCLASSIFIED', 'FVEY', 'SPECTRAL-TEST');
    expect(record.classification).toBe('UNCLASSIFIED');
    expect(record.releasability).toBe('FVEY');
    expect(record.origin).toBe('SPECTRAL-TEST');
    expect(record.data.value).toBe(42);
    expect(record.caveats).toEqual([]);
    expect(record.created_at).toBeTruthy();
  });

  it('DEFAULT_SOVEREIGN_POLICY locks to Australian regions', () => {
    expect(DEFAULT_SOVEREIGN_POLICY.primary_region).toBe('ap-southeast-2');
    expect(DEFAULT_SOVEREIGN_POLICY.backup_region).toBe('ap-southeast-4');
    expect(DEFAULT_SOVEREIGN_POLICY.permitted_regions).toHaveLength(2);
    expect(DEFAULT_SOVEREIGN_POLICY.offshore_processing_permitted).toBe(false);
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
  it('MockAfsimAdapter writes intent to disk and can read it back via pullObservations', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spectral-interop-'));
    const adapter = new MockAfsimAdapter({ rootDir: tmpDir, mode: 'spectral_as_brain' });
    const intent: AdversaryIntent = {
      exercise_id: 'EX-MOCK-01',
      turn: 1,
      objective: 'deplete magazine',
      approach: 'saturation',
      pedagogical_rationale: 'test',
      targets_competency: 'magazine_management',
      composition_summary: 'OWA x 10',
      platform_refs: ['THREAT-OWA'],
    };

    const ack = await adapter.pushAdversaryIntent(intent);
    expect(ack.accepted).toBe(true);
    expect(ack.external_exercise_id).toBe('MOCK-AFSIM-EX-MOCK-01');
    expect(ack.message).toContain('intent-EX-MOCK-01-t1.json');

    const observations = await adapter.pullObservations('EX-MOCK-01');
    expect(observations).toEqual([]);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('open-build adapter pullObservations always returns empty in open build', async () => {
    const adapter = makeOpenBuildAdapter('VBS4', 'spectral_as_coach');
    const results = await adapter.pullObservations('EX-001');
    expect(results).toEqual([]);
  });

  it('open-build adapter message includes the sim name', async () => {
    const adapter = makeOpenBuildAdapter('EADSIM', 'spectral_as_coach');
    const ack = await adapter.pushAdversaryIntent({
      exercise_id: 'EX-SIM', turn: 1, objective: 'x', approach: 'y',
      pedagogical_rationale: 'z', targets_competency: 'roe_application',
      composition_summary: 'none', platform_refs: [],
    });
    expect(ack.message).toContain('EADSIM');
  });

});


function pcmBaseState(overrides: Partial<PCM.WorldState> = {}): PCM.WorldState {
  const base: PCM.WorldState = {
    exercise_id: 'EX-BM',
    scenario_id: 'iron-crow',
    turn: 1,
    max_turns: 18,
    time_elapsed_minutes: 15,
    time_of_day: 'morning',
    phase: 'contested',
    outcome: 'continues',
    terrain: {
      grid_datum: 'UTM',
      primary_feature: 'coastal_littoral',
      elevation_model: 'SRTM',
      urban_areas: [],
      choke_points: [],
      restricted_areas: [],
      sea_border: true,
      sea_state: 2,
    },
    weather: {
      visibility_km: 10,
      cloud_base_ft: 3000,
      wind_speed_kt: 10,
      wind_bearing_deg: 270,
      temperature_c: 18,
      precipitation: 'none',
      sea_state: 1,
      eo_ir_modifier: 1,
      radar_modifier: 1,
      rf_propagation_modifier: 1,
      fpv_flyable: true,
    },
    red_force: {
      force_id: 'RED',
      platforms: [],
      ew_assets: [],
      c2: { gcs_location: 'HOTEL-9', backup_gcs: null, link_health_percent: 80, comms_status: 'nominal', primary_waveform: 'UHF', backup_waveform: 'VHF' },
      comms_status: 'nominal',
      platforms_active: 0,
      platforms_destroyed: 0,
      magazine_expended: 0,
      magazine_remaining: 0,
    },
    blue_force: {
      force_id: 'BLUE',
      platforms: [],
      ew_assets: [],
      c2: { gcs_location: 'CHARLIE-3', backup_gcs: null, link_health_percent: 85, comms_status: 'nominal', primary_waveform: 'UHF', backup_waveform: 'VHF' },
      comms_status: 'nominal',
      platforms_active: 0,
      platforms_destroyed: 0,
      magazine_expended: 0,
      magazine_remaining: 20,
    },
    all_contacts: [],
    red_orders: null,
    blue_orders: null,
    inject_queue: [],
    injects_fired: [],
    objectives: [],
    created_at: NOW,
    updated_at: NOW,
    version: 1,
  };
  return {
    ...base,
    ...overrides,
    blue_force: { ...base.blue_force, ...(overrides.blue_force ?? {}) },
    red_force: { ...base.red_force, ...(overrides.red_force ?? {}) },
  };
}

function inboundOwa(id: string): PCM.Platform {
  return {
    id,
    type: 'Shahed-136',
    group: 'OWA',
    quantity: 1,
    quantity_remaining: 1,
    location_grid: 'ECHO-7',
    altitude_m: 200,
    status: 'airborne_tasked',
    fuel_state_percent: 80,
    payload: '90kg_HE',
    guidance: 'GNSS_INS',
    ew_immune: false,
    rcs_class: 'low',
    speed_kt: 100,
    ceiling_ft: 10000,
    range_km: 2500,
    endurance_hr: 5,
  };
}

describe('BehaviourMapper — PCM bridge', () => {
  it('buildContextFlags returns empty array for benign conditions', () => {
    expect(buildContextFlags(pcmBaseState(), [])).toEqual([]);
  });

  it('buildContextFlags detects saturation at 8+ inbound OWA', () => {
    const state = pcmBaseState({
      red_force: {
        ...pcmBaseState().red_force,
        platforms: Array.from({ length: 8 }, (_, i) => inboundOwa('RED-' + i)),
      },
    });
    expect(buildContextFlags(state, [])).toContain('saturation');
  });

  it('buildContextFlags detects under_ew when comms degraded', () => {
    const state = pcmBaseState({
      blue_force: { ...pcmBaseState().blue_force, comms_status: 'degraded_light' },
    });
    expect(buildContextFlags(state, [])).toContain('under_ew');
  });

  it('buildContextFlags detects night phase', () => {
    expect(buildContextFlags(pcmBaseState({ time_of_day: 'night' }), [])).toContain('night');
  });

  it('buildContextFlags detects degraded_comms on severed status', () => {
    const state = pcmBaseState({
      blue_force: { ...pcmBaseState().blue_force, comms_status: 'severed' },
    });
    const flags = buildContextFlags(state, []);
    expect(flags).toContain('degraded_comms');
    expect(flags).toContain('under_ew');
  });

  it('buildContextFlags marks decoy_heavy when events mention decoy', () => {
    const events: PCM.AdjudicationEvent[] = [{
      event_id: 'EVT-1',
      type: 'intercept_success',
      description: 'blue intercepted decoy',
      affected_platform_ids: [],
      visible_to_red: true,
      visible_to_blue: true,
      visible_to_ds: true,
    }];
    expect(buildContextFlags(pcmBaseState(), events)).toContain('decoy_heavy');
  });

  it('buildTurnObservation always includes magazine_management behaviour', () => {
    const pre = pcmBaseState();
    const post = pcmBaseState({ turn: 1, blue_force: { ...pre.blue_force, magazine_remaining: 18 } });
    const observation = buildTurnObservation('EX-B', pre, post, null, [], null, NOW);
    expect(observation.behaviours.find((b) => b.competency === 'magazine_management')).toBeDefined();
    expect(observation.exercise_id).toBe('EX-B');
    expect(observation.turn).toBe(1);
  });

  it('buildTurnObservation marks magazine_management as failed after decoy waste', () => {
    const pre = pcmBaseState({ red_force: { ...pcmBaseState().red_force, platforms: [inboundOwa('RED-1')] } });
    const post = pcmBaseState({
      blue_force: { ...pcmBaseState().blue_force, magazine_remaining: 0 },
      red_force: { ...pcmBaseState().red_force, platforms: [inboundOwa('RED-1')] },
    });
    const events: PCM.AdjudicationEvent[] = [{
      event_id: 'EVT-DECOY',
      type: 'intercept_success',
      description: 'engaged decoy — round wasted',
      affected_platform_ids: [],
      visible_to_red: true,
      visible_to_blue: true,
      visible_to_ds: true,
    }];
    const observation = buildTurnObservation('EX-C', pre, post, null, events, null, NOW);
    expect(observation.behaviours.find((b) => b.competency === 'magazine_management')?.met_standard).toBe(false);
  });

  it('computeDecisionTimeSec returns positive seconds when blue orders follow red', () => {
    const red = { timestamp: '2026-06-14T00:00:00.000Z', platform_tasks: [] } as unknown as PCM.Order;
    const blue = { timestamp: '2026-06-14T00:00:30.000Z', platform_tasks: [] } as unknown as PCM.Order;
    expect(computeDecisionTimeSec(red, blue)).toBe(30);
  });

  it('computeDecisionTimeSec returns null when timestamps are missing', () => {
    expect(computeDecisionTimeSec(null, null)).toBeNull();
  });

  it('computeDecisionTimeSec returns null when blue timestamp precedes red', () => {
    const red = { timestamp: '2026-06-14T00:01:00.000Z', platform_tasks: [] } as unknown as PCM.Order;
    const blue = { timestamp: '2026-06-14T00:00:30.000Z', platform_tasks: [] } as unknown as PCM.Order;
    expect(computeDecisionTimeSec(red, blue)).toBeNull();
  });
});


describe('IADS Threat Catalogue', () => {
  it('contains exactly 15 entries', () => {
    expect(IADS_THREAT_CATALOGUE.length).toBe(15);
  });

  it('marks every entry with SOVEREIGN_CORE_BOUNDARY performance_ref', () => {
    for (const entry of IADS_THREAT_CATALOGUE) {
      expect(entry.performance_ref).toBe('SOVEREIGN_CORE_BOUNDARY');
    }
  });

  it('resolves every declared sam_profile_id / sam_profile_ids via getSamProfile', () => {
    // Not every entry is an air-defence node — strategic offensive systems
    // (e.g. cn-jl3-slbm-threat) deliberately carry no SAM profile. The
    // invariant is referential integrity of the ids that ARE declared.
    let checked = 0;
    for (const entry of IADS_THREAT_CATALOGUE) {
      const ids = entry.sam_profile_ids ?? (entry.sam_profile_id ? [entry.sam_profile_id] : []);
      for (const id of ids) {
        expect(getSamProfile(id), `unresolved sam profile ${id} on ${entry.id}`).toBeDefined();
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('maps all non-null effector_id values to RED_EFFECTORS', () => {
    const redIds = new Set(RED_EFFECTORS.map((e) => e.id));
    for (const entry of IADS_THREAT_CATALOGUE) {
      if (entry.effector_id) {
        expect(redIds.has(entry.effector_id)).toBe(true);
      }
    }
  });

  it('MANPADS family aggregates five SAM profiles', () => {
    const manpads = IADS_THREAT_CATALOGUE.find((e) => e.id === 'iads-manpads-family');
    expect(manpads?.sam_profile_ids?.length).toBe(5);
  });

  it('has no duplicate catalogue ids', () => {
    const ids = IADS_THREAT_CATALOGUE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
