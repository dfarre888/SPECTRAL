/** Client-safe edition detection — must match server SPECTRAL_EDITION / NEXT_PUBLIC_SPECTRAL_EDITION. */
export function isOperationsEditionClient(): boolean {
  return process.env.NEXT_PUBLIC_SPECTRAL_EDITION === 'operations'
}
