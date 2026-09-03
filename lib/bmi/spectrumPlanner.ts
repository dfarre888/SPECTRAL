/**
 * BMI comms spectrum planner — frequency-band occupancy for coalition datalinks.
 * Communications frequency planning only — not threat emitters.
 */

import type {
  BandOccupancy,
  CommsBearer,
  FreqBand,
  PlatformCommsFit,
  SpectrumPlan,
  SpectrumPlotPoint,
} from '@/lib/bmi/bmi-types'

export const COMMS_BAND_REFERENCE: Record<
  FreqBand,
  { label: string; range_mhz: [number, number] }
> = {
  HF: { label: 'HF', range_mhz: [3, 30] },
  VHF: { label: 'VHF', range_mhz: [30, 300] },
  UHF: { label: 'UHF', range_mhz: [300, 1000] },
  L: { label: 'L-band', range_mhz: [1000, 2000] },
  S: { label: 'S-band', range_mhz: [2000, 4000] },
  C: { label: 'C-band', range_mhz: [4000, 8000] },
  X: { label: 'X-band', range_mhz: [8000, 12000] },
  Ku: { label: 'Ku-band', range_mhz: [12000, 18000] },
  Ka: { label: 'Ka-band', range_mhz: [18000, 40000] },
}

const CONGESTED_THRESHOLD = 6
const MODERATE_THRESHOLD = 3

export class SpectrumPlanner {
  bandForBearer(bearer: CommsBearer): FreqBand {
    return bearer.band
  }

  analyseSpectrum(fits: PlatformCommsFit[]): SpectrumPlan {
    const bandMap = new Map<
      FreqBand,
      { bearers: CommsBearer[]; platforms: Set<string>; datalink: boolean }
    >()

    for (const fit of fits) {
      for (const b of fit.bearers) {
        const band = this.bandForBearer(b)
        const entry = bandMap.get(band) ?? {
          bearers: [],
          platforms: new Set<string>(),
          datalink: false,
        }
        entry.bearers.push(b)
        entry.platforms.add(fit.platform_id)
        if (b.kind === 'datalink') entry.datalink = true
        bandMap.set(band, entry)
      }
    }

    const occupancy: BandOccupancy[] = []
    let backbone_band: FreqBand | null = null

    for (const [band, data] of bandMap) {
      const ref = COMMS_BAND_REFERENCE[band]
      const count = data.bearers.length
      const hasLink16 = data.bearers.some((b) => b.standard === 'link16')
      if (hasLink16) backbone_band = 'L'

      occupancy.push({
        band,
        label: ref.label,
        bearer_count: count,
        platforms: [...data.platforms],
        datalink_present: data.datalink,
        congestion:
          count >= CONGESTED_THRESHOLD
            ? 'congested'
            : count >= MODERATE_THRESHOLD
              ? 'moderate'
              : 'clear',
        note: hasLink16 ? 'Coalition datalink backbone (Link 16)' : '',
      })
    }

    occupancy.sort((a, b) => {
      const aLo = COMMS_BAND_REFERENCE[a.band].range_mhz[0]
      const bLo = COMMS_BAND_REFERENCE[b.band].range_mhz[0]
      return aLo - bLo
    })

    const warnings: string[] = []
    for (const o of occupancy) {
      if (o.congestion === 'congested') {
        warnings.push(`${o.label} band congested (${o.bearer_count} bearers) — deconfliction needed`)
      }
    }

    return {
      occupancy,
      backbone_band,
      pnt_note:
        'Link 16 net entry requires GPS time sync (PNT). GNSS jamming degrades coalition datalink SA.',
      warnings,
    }
  }

  plotPoints(fits: PlatformCommsFit[]): SpectrumPlotPoint[] {
    const points: SpectrumPlotPoint[] = []
    for (const fit of fits) {
      for (const b of fit.bearers) {
        const band = this.bandForBearer(b)
        const ref = COMMS_BAND_REFERENCE[band]
        const [lo, hi] = ref.range_mhz
        const mid = (lo + hi) / 2
        points.push({
          x_mhz: mid,
          band,
          kind: b.kind,
          label: b.label,
          platform_id: fit.platform_id,
        })
      }
    }
    return points
  }
}

export const spectrumPlanner = new SpectrumPlanner()
