import type { ForceDesignQuestion, ForceDesignReport, RunOutcome } from '@/lib/moat/forceDesignEngine';
import { forceDesignEngine } from '@/lib/moat/forceDesignEngine';
import { SequentialExecutor } from '@/lib/pcm/sequential-executor';

export interface ParallelSimRequest {
  question: ForceDesignQuestion;
  mode?: 'sequential' | 'cloud';
}

export interface ParallelSimResult {
  outcomes: RunOutcome[];
  report: ForceDesignReport;
}

export class ParallelSimOrchestrator {
  constructor(private readonly sequential = new SequentialExecutor()) {}

  async run(request: ParallelSimRequest, now: string): Promise<ParallelSimResult> {
    if (request.mode === 'cloud') {
      const { CloudParallelExecutor } = await import('@/lib/pcm/sequential-executor');
      await new CloudParallelExecutor().execute();
    }
    const outcomes = await this.sequential.execute(request.question);
    const report = forceDesignEngine.analyseFromParallelResult(request.question, outcomes, now);
    return { outcomes, report };
  }
}

export const parallelSimOrchestrator = new ParallelSimOrchestrator();
