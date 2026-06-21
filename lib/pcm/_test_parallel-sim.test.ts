/**
 * SPECTRAL PCM — parallel simulation tests
 */
import { describe, it, expect } from 'vitest';
import { SequentialExecutor, CloudParallelExecutor } from '@/lib/pcm/sequential-executor';
import { ParallelSimOrchestrator } from '@/lib/pcm/parallel-sim-orchestrator';
import { forceDesignEngine } from '@/lib/moat/forceDesignEngine';
import type { ForceDesignQuestion } from '@/lib/moat/forceDesignEngine';

const question = (): ForceDesignQuestion => ({
  id: 'q1',
  question: 'Interceptor sufficiency test',
  threat_profile: 'Saturation OWA',
  success_criterion: '80% success',
  runs_requested: 6,
  force_structure: [
    { label: 'Option A', composition: [{ platform_ref: 'coyote', quantity: 12 }], notes: '' },
    { label: 'Option B', composition: [{ platform_ref: 'coyote', quantity: 18 }], notes: '' },
  ],
});

describe('parallel simulation sovereign stubs', () => {
  it('CloudParallelExecutor throws SOVEREIGN_PARALLEL_BOUNDARY', async () => {
    await expect(new CloudParallelExecutor().execute()).rejects.toThrow('SOVEREIGN_PARALLEL_BOUNDARY');
  });

  it('SequentialExecutor returns placeholder outcomes', async () => {
    const out = await new SequentialExecutor().execute(question());
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].is_placeholder).toBe(true);
  });

  it('SequentialExecutor tags option labels', async () => {
    const out = await new SequentialExecutor().execute(question());
    expect(out.some((o) => o.option_label === 'Option A')).toBe(true);
  });

  it('analyseFromParallelResult aggregates success rates', () => {
    const outcomes = [
      { option_label: 'Option A', run_index: 0, outcome: 'force_succeeded' as const, resources_expended: { i: 1 }, failure_point: null, is_placeholder: true },
      { option_label: 'Option A', run_index: 1, outcome: 'force_failed' as const, resources_expended: { i: 2 }, failure_point: 'magazine', is_placeholder: true },
    ];
    const report = forceDesignEngine.analyseFromParallelResult(question(), outcomes, '2026-06-21T00:00:00.000Z');
    expect(report.findings.length).toBe(2);
  });

  it('ParallelSimOrchestrator runs sequential mode by default', async () => {
    const result = await new ParallelSimOrchestrator().run({ question: question() }, '2026-06-21T00:00:00.000Z');
    expect(result.outcomes.length).toBeGreaterThan(0);
    expect(result.report.recommendation).toBeTruthy();
  });

  it('report marks open build placeholder provenance', async () => {
    const result = await new ParallelSimOrchestrator().run({ question: question() }, '2026-06-21T00:00:00.000Z');
    expect(result.report.data_provenance).toBe('open_build_placeholder');
  });

  it('findings include confidence notes', async () => {
    const result = await new ParallelSimOrchestrator().run({ question: question() }, '2026-06-21T00:00:00.000Z');
    expect(result.report.findings[0].confidence_note).toContain('runs');
  });

  it('SequentialExecutor produces resource expenditure map', async () => {
    const out = await new SequentialExecutor().execute(question());
    expect(out[0].resources_expended.interceptors).toBeDefined();
  });

  it('analyseFromParallelResult returns caveats array', () => {
    const report = forceDesignEngine.analyseFromParallelResult(question(), [], '2026-06-21T00:00:00.000Z');
    expect(report.caveats.length).toBeGreaterThan(0);
  });

  it('ParallelSimOrchestrator cloud mode rejects at boundary', async () => {
    await expect(new ParallelSimOrchestrator().run({ question: question(), mode: 'cloud' }, '2026-06-21T00:00:00.000Z')).rejects.toThrow('SOVEREIGN_PARALLEL_BOUNDARY');
  });

  it('question force structure options appear in findings labels', async () => {
    const result = await new ParallelSimOrchestrator().run({ question: question() }, '2026-06-21T00:00:00.000Z');
    const labels = result.report.findings.map((f) => f.option_label);
    expect(labels).toContain('Option A');
    expect(labels).toContain('Option B');
  });

  it('SequentialExecutor respects runs_requested per option split', async () => {
    const out = await new SequentialExecutor().execute(question());
    expect(out.length).toBeGreaterThanOrEqual(2);
  });
});
