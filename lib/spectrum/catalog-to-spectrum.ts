/**
 * Callers: components/spectrum/data.ts (usePlatforms merge)
 * Purpose: Project Force Catalogue OrBat rows onto Spectrum Platform + band-envelope capabilities.
 * Honesty: IEEE / COMMS_BAND_REFERENCE envelopes only — never invent centre freqs or ERP.
 * Spec: PCM → Spectrum bridge (OSINT / ITAR-safe)
 */

import { FORCE_CATALOG } from '@/data/force-catalog'
import type { CommsBearer, ForceCatalogPlatformFull, FreqBand } from '@/lib/bmi/bmi-types'
import { COMMS_BAND_REFERENCE } from '@/lib/bmi/spectrumPlanner'
import { RADAR_BAND_HZ, type RadarBand } from '@/lib/spectrum/radar-types'
import type {
  CapabilityFunction,
  Platform,
  Side,
  SourceConfidence,
  SpectrumCapability,
  SpectrumLayer,
} from '@/lib/spectrum/types'

const RADAR_BANDS = new Set<string>(Object.keys(RADAR_BAND_HZ))

function mhzToHz(mhz: number): number {
  return mhz * 1e6
}

function mapSide(side: ForceCatalogPlatformFull['force_side']): Side {
  return side
}

function mapConfidence(c: ForceCatalogPlatformFull['data_confidence']): SourceConfidence {
  if (c === 'high') return 'derived'
  if (c === 'medium') return 'derived'
  return 'estimated'
}

function fnForBearer(b: CommsBearer): CapabilityFunction {
  switch (b.kind) {
    case 'datalink':
      return 'datalink'
    case 'voice_satcom':
      return 'datalink'
    case 'voice_uhf':
    case 'voice_vhf':
    case 'voice_hf':
      return 'control'
    default:
      return 'datalink'
  }
}

function layerForFn(fn: CapabilityFunction): SpectrumLayer {
  if (fn === 'radar_emit') return 'radar'
  if (fn === 'navigation') return 'navigation'
  return 'comms'
}

function bearerToCapability(
  platformId: string,
  b: CommsBearer,
  index: number,
): SpectrumCapability | null {
  const ref = COMMS_BAND_REFERENCE[b.band as FreqBand]
  if (!ref) return null
  const [loMhz, hiMhz] = ref.range_mhz
  const fn = fnForBearer(b)
  return {
    id: `${platformId}-pcm-${b.kind}-${b.band}-${index}`,
    platform_id: platformId,
    axis: 'rf',
    layer: layerForFn(fn),
    fn,
    label: `${b.label || b.kind} · ${ref.label} (band envelope)`,
    freq_low_hz: mhzToHz(loMhz),
    freq_high_hz: mhzToHz(hiMhz),
    note: `PCM OrBat — IEEE/band envelope only (${b.band}). Not a measured centre frequency.`,
    derived: true,
  }
}

function sensorRadarToCapability(
  platformId: string,
  bandRaw: string,
  index: number,
  label: string,
): SpectrumCapability | null {
  const band = bandRaw.trim() as RadarBand
  if (!RADAR_BANDS.has(band)) return null
  const [lo, hi] = RADAR_BAND_HZ[band]
  return {
    id: `${platformId}-pcm-radar-${band}-${index}`,
    platform_id: platformId,
    axis: 'rf',
    layer: 'radar',
    fn: 'radar_emit',
    label: `${label || 'Radar'} · ${band}-band (IEEE envelope)`,
    freq_low_hz: lo,
    freq_high_hz: hi,
    note: 'PCM OrBat — IEEE 521-2002 band envelope only. Not a curated fire-control dossier.',
    derived: true,
  }
}

function categoryFor(p: ForceCatalogPlatformFull): string {
  if (p.role === 'isr') return 'ISR'
  if (p.role === 'ew') return 'EW'
  if (p.role === 'radar_ground') return 'GBAD / radar'
  if (p.role === 'fighter' || p.role === 'multirole') return 'Combat air'
  if (p.role === 'aew_c') return 'AEW&C'
  if (p.domain === 'maritime') return 'Maritime'
  if (p.domain === 'ground') return 'Land'
  return p.role || p.domain
}

/** True when the catalog row has at least one band we can plot honestly. */
export function catalogHasPlottableRf(p: ForceCatalogPlatformFull): boolean {
  if (p.comms?.length) return true
  return (p.sensors ?? []).some((s) => s.kind === 'radar' && s.band && RADAR_BANDS.has(s.band))
}

export function catalogPlatformToSpectrum(p: ForceCatalogPlatformFull): Platform | null {
  if (!catalogHasPlottableRf(p)) return null

  const id = `pcm-${p.id}`
  const capabilities: SpectrumCapability[] = []

  ;(p.comms ?? []).forEach((b, i) => {
    const cap = bearerToCapability(id, b, i)
    if (cap) capabilities.push(cap)
  })

  ;(p.sensors ?? []).forEach((s, i) => {
    if (s.kind !== 'radar' || !s.band) return
    const cap = sensorRadarToCapability(id, s.band, i, s.label)
    if (cap) capabilities.push(cap)
  })

  if (!capabilities.length) return null

  return {
    id,
    name: p.short_name || p.designation,
    variant_label: p.designation !== p.short_name ? p.designation : null,
    side: mapSide(p.force_side),
    origin: p.nation_name || p.nation_code,
    category: categoryFor(p),
    role: p.role,
    confidence: mapConfidence(p.data_confidence),
    intel_note: [
      'Source: Force Catalogue (PCM) OrBat — OSINT band envelopes.',
      p.open_source_summary?.slice(0, 280) || '',
    ]
      .filter(Boolean)
      .join(' '),
    icon: p.force_side === 'red' ? '◆' : p.force_side === 'blue' ? '◇' : '○',
    capabilities,
  }
}

export interface CatalogSpectrumMergeResult {
  platforms: Platform[]
  added: number
  skippedNoRf: number
  skippedSeedOverlap: number
}

/**
 * Merge PCM catalog into Spectrum seed.
 * Curated seed rows always win when `platform_library_id` matches a seed id.
 */
export function mergeCatalogIntoSpectrum(seed: Platform[]): CatalogSpectrumMergeResult {
  const seedIds = new Set(seed.map((p) => p.id))
  const out = [...seed]
  let added = 0
  let skippedNoRf = 0
  let skippedSeedOverlap = 0

  for (const row of FORCE_CATALOG) {
    if (row.platform_library_id && seedIds.has(row.platform_library_id)) {
      skippedSeedOverlap += 1
      continue
    }
    if (!catalogHasPlottableRf(row)) {
      skippedNoRf += 1
      continue
    }
    const mapped = catalogPlatformToSpectrum(row)
    if (!mapped) {
      skippedNoRf += 1
      continue
    }
    out.push(mapped)
    added += 1
  }

  return { platforms: out, added, skippedNoRf, skippedSeedOverlap }
}

/** Convenience for hooks — full merged library. */
export function loadSpectrumPlatformsWithCatalog(seed: Platform[]): Platform[] {
  return mergeCatalogIntoSpectrum(seed).platforms
}
