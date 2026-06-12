export type SpectralEdition = 'training' | 'operations'

export function getEdition(): SpectralEdition {
  const v = process.env.SPECTRAL_EDITION ?? process.env.NEXT_PUBLIC_SPECTRAL_EDITION
  return v === 'operations' ? 'operations' : 'training'
}

export function isOperationsEdition(): boolean {
  return getEdition() === 'operations'
}
