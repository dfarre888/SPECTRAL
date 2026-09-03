/**
 * Unified export bundle v1 tests
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import { describe, expect, it } from 'vitest';
import {
  buildUnifiedExport,
  UNIFIED_EXPORT_SCHEMA,
  unifiedExportSections,
  validateUnifiedExport,
} from '@/lib/planner/export-unified';
import { emptyLaydownDocument, type BattlespacePlanRow } from '@/lib/planner/battlespace-plan';

function mockPlan(overrides: Partial<BattlespacePlanRow> = {}): BattlespacePlanRow {
  const laydown = emptyLaydownDocument();
  laydown.uas.push({
    instanceId: 'uas-1',
    assetId: 'shahed-136',
    lon: 145.7,
    lat: -16.9,
    terrainAMSL: 200,
    discAltitude_m: 350,
    lateralRadius_m: 5000,
    ceilingAMSL_m: 550,
    annotationTime_min: 0,
    effectiveRange_km: 250,
  });
  laydown.economics.scenarios.push({
    id: 'econ-1',
    platformId: 'shahed-136',
    defeatSystemId: 'nasams-amraam-er',
    salvoSize: 2,
  });
  laydown.comms.gateway_nodes = ['gw-alpha'];
  laydown.coalition.exercise_id = 'pitch-black-2026';

  return {
    id: 'plan-1',
    tenant_id: null,
    user_id: 'user-1',
    name: 'North QLD belt',
    classification: 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY',
    phase: 'plan',
    vignette_id: null,
    laydown,
    iads_stacks: [],
    economics_scenarios: [],
    adjudication_pairs: null,
    published_wopr_id: null,
    published_pcm_exercise_id: null,
    created_at: '2026-07-19T00:00:00.000Z',
    updated_at: '2026-07-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('UnifiedExportBundle v1', () => {
  it('schema is SPECTRAL_UNIFIED_V1', () => {
    const bundle = buildUnifiedExport(mockPlan());
    expect(bundle.schema).toBe(UNIFIED_EXPORT_SCHEMA);
  });

  it('validateUnifiedExport accepts valid bundle', () => {
    const bundle = buildUnifiedExport(mockPlan());
    const result = validateUnifiedExport(bundle);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bundle.planId).toBe('plan-1');
  });

  it('rejects missing schema', () => {
    const bundle = buildUnifiedExport(mockPlan());
    const broken = { ...bundle, schema: 'WRONG' };
    const result = validateUnifiedExport(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.includes('schema'))).toBe(true);
  });

  it('afsim entities from plan laydown', () => {
    const bundle = buildUnifiedExport(mockPlan());
    expect(bundle.afsim.entities).toHaveLength(1);
    expect(bundle.afsim.entities[0]?.id).toBe('uas-1');
    expect(bundle.afsim.entities[0]?.side).toBe('red');
  });

  it('accredited_data_included is false', () => {
    const bundle = buildUnifiedExport(mockPlan());
    expect(bundle.metadata.accredited_data_included).toBe(false);
  });

  it('economics note present', () => {
    const bundle = buildUnifiedExport(mockPlan());
    expect(bundle.economics.note).toContain('accredited');
    expect(bundle.economics.scenarios).toHaveLength(1);
  });

  it('classification copied from plan', () => {
    const bundle = buildUnifiedExport(mockPlan());
    expect(bundle.classification).toBe('UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY');
    expect(bundle.afsim.classification).toBe(bundle.classification);
  });

  it('content sections present for audit metadata', () => {
    const bundle = buildUnifiedExport(mockPlan());
    const sections = unifiedExportSections(bundle);
    expect(sections).toContain('afsim');
    expect(sections).toContain('economics');
    expect(sections).toContain('plan_document');
    expect(sections).toContain('interop');
  });
});
