/**
 * Two-ray ground reflection model for low-altitude links.
 * Assessed — classic EW reference model, not site-specific.
 */
export function twoRayPathLossDb(
  distance_m: number,
  freq_hz: number,
  tx_alt_m: number,
  rx_alt_m: number,
): number {
  const d = Math.max(distance_m, 1)
  const lambda = 299792458 / freq_hz
  const h1 = Math.max(tx_alt_m, 1)
  const h2 = Math.max(rx_alt_m, 1)

  const d_cross = (4 * Math.PI * h1 * h2) / lambda
  if (d <= d_cross) {
    const fspl = 20 * Math.log10(d) + 20 * Math.log10(freq_hz) - 147.55
    return fspl
  }

  const loss = 40 * Math.log10(d) - 10 * Math.log10(h1 * h2)
  return Math.max(loss, 40)
}

export function multipathMarginDb(urban: boolean, los: boolean): number {
  if (los && !urban) return 12
  if (los && urban) return 8
  return 3
}
