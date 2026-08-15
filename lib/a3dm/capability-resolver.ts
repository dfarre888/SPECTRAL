import { osintPerformanceFor } from '@/data/a3dm/performance-osint'
import { bandsForPayload } from '@/data/a3dm/payload-bands'
import { getA3dmDrone, payloadsForPlatform } from '@/lib/a3dm/catalog'
import type { PayloadBandSpec } from '@/lib/a3dm/types'
import type { SpectrumCapability } from '@/lib/spectrum/types'

const MHz = (m: number) => m * 1e6

function airframeRf(platformId: string, rangeKm: number | undefined): SpectrumCapability[] {
  const drone = getA3dmDrone(platformId)
  const perf = drone ? osintPerformanceFor(drone.id, drone.name) : null
  const link = (perf?.control_link_freq ?? '').toLowerCase()
  const caps: SpectrumCapability[] = []
  let n = 0
  const add = (partial: Omit<SpectrumCapability, 'id' | 'platform_id'>) => {
    caps.push({ id: `${platformId}-a3dm-${++n}`, platform_id: platformId, ...partial })
  }

  add({
    axis: 'rf', layer: 'comms', fn: 'control',
    label: 'C2 — 2.4 GHz ISM',
    freq_low_hz: MHz(2400), freq_high_hz: MHz(2483.5),
    range_km: rangeKm ?? perf?.range_km ?? null,
    derived: !perf,
  })
  add({
    axis: 'rf', layer: 'comms', fn: 'video',
    label: 'Video — 5.8 GHz ISM',
    freq_low_hz: MHz(5725), freq_high_hz: MHz(5875),
    derived: !perf,
  })
  if (link.includes('900')) {
    add({
      axis: 'rf', layer: 'comms', fn: 'control',
      label: 'C2 — 900 MHz',
      freq_low_hz: MHz(902), freq_high_hz: MHz(928),
    })
  }
  add({
    axis: 'gnss', layer: 'navigation', fn: 'navigation',
    label: 'GPS L1',
    freq_low_hz: MHz(1574.42), freq_high_hz: MHz(1576.42),
  })
  if (perf?.gnss_used?.some((g) => /glonass/i.test(g))) {
    add({
      axis: 'gnss', layer: 'navigation', fn: 'navigation',
      label: 'GLONASS G1',
      freq_low_hz: MHz(1598), freq_high_hz: MHz(1606),
    })
  }
  if (perf?.gnss_used?.some((g) => /beidou/i.test(g))) {
    add({
      axis: 'gnss', layer: 'navigation', fn: 'navigation',
      label: 'BeiDou B1',
      freq_low_hz: MHz(1560.098), freq_high_hz: MHz(1562.098),
    })
  }
  return caps
}

function bandToCap(platformId: string, payloadId: string, band: PayloadBandSpec, i: number): SpectrumCapability {
  return {
    id: `${platformId}-${payloadId}-${i}`,
    platform_id: platformId,
    axis: band.axis,
    layer: band.layer,
    fn: band.fn,
    label: band.label,
    freq_low_hz: band.freq_low_hz ?? null,
    freq_high_hz: band.freq_high_hz ?? null,
    wavelength_low_um: band.wavelength_low_um ?? null,
    wavelength_high_um: band.wavelength_high_um ?? null,
    note: band.note ?? null,
  }
}

/** Airframe RF/GNSS + compatible payload bands (selected payloads or all documented). */
export function resolveA3dmCapabilities(
  platformId: string,
  payloadIds?: string[],
): SpectrumCapability[] {
  const drone = getA3dmDrone(platformId)
  if (!drone) return []

  const perf = osintPerformanceFor(drone.id, drone.name)
  const caps = airframeRf(platformId, perf?.range_km)

  const payloads = payloadsForPlatform(drone.id)
  const selected = payloadIds?.length
    ? payloads.filter((p) => payloadIds.includes(p.id))
    : payloads

  for (const payload of selected) {
    if (!payload.spectrum_eligible) continue
    const bands = bandsForPayload(payload.id, payload.type)
    bands.forEach((band, i) => caps.push(bandToCap(platformId, payload.id, band, i)))
  }

  return caps
}
