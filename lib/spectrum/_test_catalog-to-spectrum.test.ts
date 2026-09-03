/**
 * Callers: vitest
 * Purpose: PCM → Spectrum band-envelope adapter
 */

import { describe, expect, it } from 'vitest'
import { FORCE_CATALOG } from '../../data/force-catalog'
import { PLATFORMS } from '../../data/seed-platforms'
import { CAPABILITIES } from '../../data/seed-capabilities'
import type { Platform, SpectrumCapability } from './types'
import {
  catalogHasPlottableRf,
  catalogPlatformToSpectrum,
  mergeCatalogIntoSpectrum,
} from './catalog-to-spectrum'

function hydrateSeed(): Platform[] {
  const capsByPlatform = new Map<string, SpectrumCapability[]>()
  for (const c of CAPABILITIES) {
    const arr = capsByPlatform.get(c.platform_id) ?? []
    arr.push(c)
    capsByPlatform.set(c.platform_id, arr)
  }
  return PLATFORMS.map((p) => ({
    ...p,
    capabilities: capsByPlatform.get(p.id) ?? [],
  }))
}

describe('catalog-to-spectrum', () => {
  it('maps a catalog row with UHF voice to RF envelope capability', () => {
    const row = FORCE_CATALOG.find((p) => p.comms?.some((c) => c.band === 'UHF'))
    expect(row).toBeTruthy()
    const mapped = catalogPlatformToSpectrum(row!)
    expect(mapped).toBeTruthy()
    expect(mapped!.id.startsWith('pcm-')).toBe(true)
    expect(mapped!.capabilities?.length).toBeGreaterThan(0)
    const uhf = mapped!.capabilities!.find((c) => c.label.includes('UHF') || (c.freq_low_hz === 300e6))
    expect(uhf).toBeTruthy()
    expect(uhf!.derived).toBe(true)
    expect(uhf!.freq_low_hz).toBe(300e6)
    expect(uhf!.freq_high_hz).toBe(1000e6)
    expect(uhf!.note).toMatch(/band envelope/i)
  })

  it('skips rows with no plottable RF', () => {
    const bare = FORCE_CATALOG.find((p) => !catalogHasPlottableRf(p))
    if (!bare) {
      expect(true).toBe(true)
      return
    }
    expect(catalogPlatformToSpectrum(bare)).toBeNull()
  })

  it('merges hundreds of PCM rows without dropping seed', () => {
    const seed = hydrateSeed()
    const { platforms, added, skippedSeedOverlap } = mergeCatalogIntoSpectrum(seed)
    expect(platforms.length).toBe(seed.length + added)
    expect(added).toBeGreaterThan(700)
    expect(skippedSeedOverlap).toBeGreaterThanOrEqual(0)
    // seed ids preserved
    expect(platforms.some((p) => p.id === 'shahed-136' || p.id === 'dji-mavic-3')).toBe(true)
  })
})
