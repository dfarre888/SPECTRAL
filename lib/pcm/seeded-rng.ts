/**
 * Deterministic PRNG for PCM turn adjudication (replay / audit).
 */

export function hashTurnSeed(exerciseId: string, turn: number, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < exerciseId.length; i++) {
    h = Math.imul(31, h) + exerciseId.charCodeAt(i);
    h >>>= 0;
  }
  return (h + turn) >>> 0;
}

/** Mulberry32 — deterministic given seed. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
