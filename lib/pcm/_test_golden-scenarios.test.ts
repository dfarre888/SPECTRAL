import { describe, it, expect } from 'vitest';
import {
  GOLDEN_SCENARIOS,
  assertGoldenScenario,
  runAllGoldenScenarios,
  allGoldenScenariosPass,
} from '@/lib/pcm/golden-scenarios';

describe('PCM golden scenarios', () => {
  it('registers four canonical scenarios', () => {
    expect(GOLDEN_SCENARIOS.map((s) => s.id)).toEqual([
      'iron_crow_shahed_krasukha',
      'shahed_dronegun_uhf',
      'thaad_tpy2_xband',
      'fibre_optic_rf_blind',
    ]);
  });

  for (const scenario of GOLDEN_SCENARIOS) {
    it('passes ' + scenario.id, () => {
      const result = assertGoldenScenario(scenario.id);
      expect(result.passed, result.message).toBe(true);
    });
  }

  it('runAllGoldenScenarios aggregate pass', () => {
    expect(allGoldenScenariosPass()).toBe(true);
    expect(runAllGoldenScenarios().filter((r) => !r.passed)).toHaveLength(0);
  });
});
