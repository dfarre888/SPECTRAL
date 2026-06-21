import type { ForceDesignQuestion, RunOutcome } from '@/lib/moat/forceDesignEngine';

export class SequentialExecutor {
  async execute(question: ForceDesignQuestion, seed = 42): Promise<RunOutcome[]> {
    const outcomes: RunOutcome[] = [];
    let idx = 0;
    for (const opt of question.force_structure) {
      for (let run = 0; run < Math.max(1, Math.floor(question.runs_requested / question.force_structure.length)); run++) {
        const success = (seed + idx + run) % 3 !== 0;
        outcomes.push({
          option_label: opt.label,
          run_index: idx++,
          outcome: success ? 'force_succeeded' : 'marginal',
          resources_expended: { interceptors: success ? 8 : 12 },
          failure_point: success ? null : 'magazine exhaustion under decoy mix',
          is_placeholder: true,
        });
      }
    }
    return outcomes;
  }
}

export class CloudParallelExecutor {
  async execute(): Promise<never> {
    throw new Error('SOVEREIGN_PARALLEL_BOUNDARY: cloud parallel execution is disabled in Training tier; run sequential executor in sovereign region.');
  }
}
