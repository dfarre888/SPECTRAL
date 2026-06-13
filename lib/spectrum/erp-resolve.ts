import type { BandOverlap } from '@/lib/spectrum/types'
import type { Platform, SpectrumCapability } from '@/lib/spectrum/types'
import type { ConfidenceLevel } from '@/lib/propagation/types'

export interface JamTransmit {
  erp_dbm: number
  freq_hz: number
  confidence: ConfidenceLevel
  source: string
}

const JAM_FNS = new Set([
  'jam_control',
  'jam_video',
  'jam_gnss',
  'jam_datalink',
  'spoof_gnss',
])

const ESTIMATED_RF_JAM_DBM = 35
const ASSESSED_RF_JAM_DBM = 40

function bandCentreHz(cap: SpectrumCapability): number | null {
  if (cap.freq_low_hz != null && cap.freq_high_hz != null) {
    return (cap.freq_low_hz + cap.freq_high_hz) / 2
  }
  return null
}

function pickJamCapability(
  blue: Platform,
  overlap?: BandOverlap | null,
): SpectrumCapability | null {
  const jams = (blue.capabilities ?? []).filter((c) => JAM_FNS.has(c.fn))
  if (jams.length === 0) return null

  if (overlap && overlap.unit === 'hz') {
    const match = jams.find((j) => {
      const lo = j.freq_low_hz ?? 0
      const hi = j.freq_high_hz ?? 0
      return lo <= overlap.hi && hi >= overlap.lo
    })
    if (match) return match
  }

  return jams.find((j) => j.fn === 'jam_control') ?? jams[0]
}

/** Resolve jammer ERP and centre frequency from spectrum capabilities + overlap band. */
export function resolveJamTransmit(
  blue: Platform,
  overlap?: BandOverlap | null,
): JamTransmit {
  const cap = pickJamCapability(blue, overlap)
  const freq_hz =
    overlap && overlap.unit === 'hz'
      ? (overlap.lo + overlap.hi) / 2
      : cap
        ? bandCentreHz(cap) ?? 2.4e9
        : 2.4e9

  if (!cap) {
    return {
      erp_dbm: ESTIMATED_RF_JAM_DBM,
      freq_hz,
      confidence: 'Estimated',
      source: 'No jam capability — OSINT default',
    }
  }

  if (cap.power_dbm != null && Number.isFinite(cap.power_dbm)) {
    return {
      erp_dbm: cap.power_dbm,
      freq_hz,
      confidence: cap.derived ? 'Assessed' : 'Confirmed',
      source: cap.label,
    }
  }

  const isRfJam = cap.fn.startsWith('jam_') || cap.fn === 'spoof_gnss'
  return {
    erp_dbm: isRfJam ? ASSESSED_RF_JAM_DBM : ESTIMATED_RF_JAM_DBM,
    freq_hz,
    confidence: 'Assessed',
    source: `${cap.label} — template ERP`,
  }
}

/** Convenience when only overlaps array is available (uses first overlap). */
export function resolveJamFromEngagement(
  blue: Platform,
  overlaps: BandOverlap[],
): JamTransmit {
  const rfOverlap = overlaps.find((o) => o.axis === 'rf' || o.axis === 'gnss') ?? overlaps[0]
  return resolveJamTransmit(blue, rfOverlap ?? null)
}
