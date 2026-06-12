export function formatRangeKm(km: number | null | undefined): string {
  if (km == null) return '—'
  return `${km.toLocaleString()} km`
}

export function formatAltitudeM(m: number | null | undefined): string {
  if (m == null) return '—'
  return `${m.toLocaleString()} m`
}

export function formatFrequencyBand(
  c2Uplink: number[] | null | undefined,
  dataLink: number[] | null | undefined
): string {
  const freqs = [...(c2Uplink ?? []), ...(dataLink ?? [])].filter(Boolean)
  if (freqs.length === 0) return '—'
  const primary = freqs[0]
  if (primary >= 1000) return `${(primary / 1000).toFixed(1)} GHz`
  return `${primary} MHz`
}
