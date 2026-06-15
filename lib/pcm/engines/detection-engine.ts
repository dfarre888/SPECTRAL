/**
 * PCM detection phase — fog-of-war sensor pictures.
 */

import type { PCM } from '@/lib/pcm/spectral.types';
import { fogOfWarEngine } from '@/lib/pcm/fogOfWarEngine';
import { createSeededRng } from '@/lib/pcm/seeded-rng';

export function runDetectionPhase(state: PCM.WorldState, seed: number): void {
  const sensorRng = createSeededRng(seed + 1);
  const red = fogOfWarEngine.generateSensorPicture(state, 'RED', { rng: sensorRng });
  const blue = fogOfWarEngine.generateSensorPicture(state, 'BLUE', { rng: sensorRng });
  state.all_contacts = [...red, ...blue];
}
