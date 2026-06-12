/**
 * ITU-R P.1411 short-range urban NLOS excess loss (statistical).
 * Estimated — street-canyon heuristic for training/planning.
 */
export function p1411UrbanExcessLossDb(
  distance_m: number,
  freq_hz: number,
  density: 'suburban' | 'urban' | 'dense_urban',
): number {
  const d = Math.max(distance_m, 10)
  const f_ghz = freq_hz / 1e9
  const base = density === 'dense_urban' ? 28 : density === 'urban' ? 22 : 14
  return base + 35 * Math.log10(d) + 20 * Math.log10(f_ghz)
}
