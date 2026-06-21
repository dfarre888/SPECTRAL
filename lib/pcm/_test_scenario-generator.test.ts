/**
 * SPECTRAL PCM — scenario generator tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LongitudinalCompetencyRecord } from '@/lib/moat/learnerModel.types';

const querySpectralMock = vi.fn();
vi.mock('@/lib/claude/client', () => ({ querySpectral: (...args: unknown[]) => querySpectralMock(...args) }));

import { ScenarioGeneratorEngine, COMPETENCY_TO_CONDITION_MAP, parseJsonFence } from '@/lib/pcm/scenario-generator-engine';

describe('scenario-generator-engine', () => {
  beforeEach(() => querySpectralMock.mockReset());

  it('maps all 11 competencies', () => {
    expect(Object.keys(COMPETENCY_TO_CONDITION_MAP)).toHaveLength(11);
    expect(COMPETENCY_TO_CONDITION_MAP.magazine_management.trigger_conditions).toContain('saturation');
  });

  it('parseJsonFence extracts fenced JSON', () => {
    const raw = ['prefix', '```json', '{"title":"EX ALPHA","generation_rationale":"test"}', '```'].join('\n');
    expect(parseJsonFence(raw).title).toBe('EX ALPHA');
  });

  it('parseJsonFence handles bare JSON object', () => {
    expect(parseJsonFence('{"title":"Bare"}').title).toBe('Bare');
  });

  it('parseJsonFence returns empty object on garbage', () => {
    expect(parseJsonFence('no json here')).toEqual({});
  });

  it('generateFromLearnerRecord defaults competency without record', async () => {
    querySpectralMock.mockResolvedValue('{}');
    const engine = new ScenarioGeneratorEngine();
    const cfg = await engine.generateFromLearnerRecord({ player_id: 'p1', callsign: 'VIPER' });
    expect(cfg.primary_target_competency).toBe('decision_under_uncertainty');
    expect(cfg.inject_sequence.length).toBeGreaterThan(0);
  });

  it('refineWithAI merges title from Claude fenced JSON', async () => {
    querySpectralMock.mockResolvedValue('```json\n{"title":"EX MERGED","generation_rationale":"merged"}\n```');
    const engine = new ScenarioGeneratorEngine();
    const cfg = await engine.generateFromLearnerRecord({ player_id: 'p1', callsign: 'VIPER' });
    expect(cfg.title).toBe('EX MERGED');
    expect(cfg.generation_method).toBe('ai_assisted');
  });

  it('uses blind spot competency when learner record present', async () => {
    querySpectralMock.mockResolvedValue('{}');
    const engine = new ScenarioGeneratorEngine();
    const cfg = await engine.generateFromLearnerRecord({
      player_id: 'p1', callsign: 'VIPER', learner_record: {
        player_id: 'p1', callsign: 'VIPER', created_at: '2026-01-01', updated_at: '2026-01-01',
        competencies: {} as LongitudinalCompetencyRecord['competencies'],
        blind_spots: [{ id: 'bs1', competency: 'magazine_management', description: 'magazine drain', first_observed_exercise_id: 'ex1', first_observed_at: '2026-01-01', recurrence_count: 2, sessions_observed: ['ex1'], severity: 'critical', status: 'active', trigger_conditions: ['saturation'], curriculum_module_assigned: null, resolution_evidence: null }],
        total_exercises: 1, total_turns: 4, first_exercise_at: '2026-01-01', most_recent_exercise_at: '2026-01-02',
        decision_speed_profile: { baseline_sec: 30, under_ew_sec: 45, under_saturation_sec: 50, at_night_sec: null },
        overall_level: 'trainee',
        competency_summary: {} as LongitudinalCompetencyRecord['competency_summary'],
      } as LongitudinalCompetencyRecord,
    });
    expect(cfg.primary_target_competency).toBe('magazine_management');
  });

  it('sets under_trigger_pd lower for decision_under_uncertainty', async () => {
    querySpectralMock.mockResolvedValue('{}');
    const engine = new ScenarioGeneratorEngine();
    const cfg = await engine.generateFromLearnerRecord({ player_id: 'p1', callsign: 'X' });
    expect(cfg.estimated_pd_envelope.under_trigger_pd).toBeLessThan(0.05);
  });

  it('generateFromObjectives delegates to learner path', async () => {
    querySpectralMock.mockResolvedValue('{}');
    const engine = new ScenarioGeneratorEngine();
    const cfg = await engine.generateFromObjectives({ player_id: 'p1', callsign: 'HAWK' });
    expect(cfg.title).toContain('HAWK');
  });

  it('includes instructor focus points with turn ranges', async () => {
    querySpectralMock.mockResolvedValue('{}');
    const engine = new ScenarioGeneratorEngine();
    const cfg = await engine.generateFromLearnerRecord({ player_id: 'p1', callsign: 'X' });
    expect(cfg.instructor_focus_points[0].turn_range[0]).toBeLessThan(cfg.instructor_focus_points[0].turn_range[1]);
  });
});
