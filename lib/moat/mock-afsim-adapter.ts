/**
 * File-based mock AFSIM adapter for open-build interop smoke tests.
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  AdversaryIntent,
  ExternalSimAck,
  ExternalSimAdapter,
  IntegrationMode,
  NormalisedObservation,
} from '@/lib/moat/interopLayer';

const DEFAULT_ROOT = path.join(process.cwd(), '.spectral', 'interop');

export interface MockAfsimAdapterOptions {
  rootDir?: string;
  mode?: IntegrationMode;
}

export class MockAfsimAdapter implements ExternalSimAdapter {
  readonly sim = 'AFSIM' as const;
  readonly mode: IntegrationMode;
  private readonly outDir: string;
  private readonly inDir: string;

  constructor(options: MockAfsimAdapterOptions = {}) {
    const root = options.rootDir ?? DEFAULT_ROOT;
    this.mode = options.mode ?? 'spectral_as_brain';
    this.outDir = path.join(root, 'out');
    this.inDir = path.join(root, 'in');
    fs.mkdirSync(this.outDir, { recursive: true });
    fs.mkdirSync(this.inDir, { recursive: true });
  }

  async pushAdversaryIntent(intent: AdversaryIntent): Promise<ExternalSimAck> {
    const file = path.join(this.outDir, 'intent-' + intent.exercise_id + '-t' + intent.turn + '.json');
    fs.writeFileSync(file, JSON.stringify(intent, null, 2), 'utf-8');
    return {
      accepted: true,
      external_exercise_id: 'MOCK-AFSIM-' + intent.exercise_id,
      message: 'Mock AFSIM wrote ' + path.basename(file),
    };
  }

  async pullObservations(exerciseId: string): Promise<NormalisedObservation[]> {
    const prefix = 'obs-' + exerciseId;
    const files = fs
      .readdirSync(this.inDir)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.json'));
    const out: NormalisedObservation[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(this.inDir, file), 'utf-8');
      out.push(JSON.parse(raw) as NormalisedObservation);
    }
    return out.sort((a, b) => a.turn - b.turn);
  }
}
