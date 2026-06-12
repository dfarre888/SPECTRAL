/**
 * ITU-R P.525 free-space path loss.
 * FSPL(dB) = 20 log10(d) + 20 log10(f) + 32.44  (d km, f MHz)
 */
export function freeSpacePathLossDb(distance_m: number, freq_hz: number): number {
  const d_km = Math.max(distance_m, 1) / 1000
  const f_mhz = freq_hz / 1e6
  return 20 * Math.log10(d_km) + 20 * Math.log10(f_mhz) + 32.44
}

export function receivedPowerDbm(erp_dbm: number, path_loss_db: number): number {
  return erp_dbm - path_loss_db
}
