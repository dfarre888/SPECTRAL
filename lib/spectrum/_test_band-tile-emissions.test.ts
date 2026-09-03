/**
 * Callers: vitest
 * Purpose: band-tile emission intersection — no invented freqs
 */

import { describe, expect, it } from 'vitest'
import { BAND_TILES } from '@/lib/spectrum/band-tile-data'
import { emissionIntersectsTile } from '@/lib/map/laydown-tiles'
import {
  budgetEmissions,
  classifyAssetType,
  defaultBandTileFilters,
  filterBandTileEmissions,
  kindForSpectrumPlatform,
  platformsToLaydownEmissions,
} from './band-tile-emissions'
import type { Platform, SpectrumCapability } from './types'

function tile(id: string) {
  const t = BAND_TILES.find((x) => x.id === id)
  if (!t) throw new Error(`missing tile ${id}`)
  return t
}

function platform(partial: Partial<Platform> & { id: string; name: string; side: Platform['side'] }): Platform {
  return {
    category: 'test',
    origin: 'OSINT',
    ...partial,
  } as Platform
}

describe('platformsToLaydownEmissions', () => {
  it('UHF voice envelope intersects UHF tile, not VHF', () => {
    const p = platform({
      id: 'pcm-test-uhf',
      name: 'Test UHF Voice',
      side: 'blue',
      confidence: 'derived',
      capabilities: [
        {
          id: 'c-uhf',
          platform_id: 'pcm-test-uhf',
          label: 'UHF voice (band envelope)',
          layer: 'comms',
          axis: 'rf',
          fn: 'control',
          freq_low_hz: 400e6,
          freq_high_hz: 900e6,
          derived: true,
          note: 'IEEE band envelope — not curated centre freq',
        } satisfies SpectrumCapability,
      ],
    })
    const emissions = platformsToLaydownEmissions([p])
    expect(emissions).toHaveLength(1)
    expect(emissions[0].derived).toBe(true)
    expect(emissionIntersectsTile(emissions[0], tile('uhf'))).toBe(true)
    expect(emissionIntersectsTile(emissions[0], tile('vhf'))).toBe(false)
  })

  it('X-band radar intersects SHF tile', () => {
    const p = platform({
      id: 'seed-x-radar',
      name: 'Test X Fire Control',
      side: 'blue',
      role: 'radar_ground',
      confidence: 'curated',
      capabilities: [
        {
          id: 'c-x',
          platform_id: 'seed-x-radar',
          label: 'X-band FC',
          layer: 'radar',
          axis: 'rf',
          fn: 'radar_emit',
          freq_low_hz: 8e9,
          freq_high_hz: 12e9,
        } satisfies SpectrumCapability,
      ],
    })
    const emissions = platformsToLaydownEmissions([p])
    expect(emissions).toHaveLength(1)
    expect(classifyAssetType(p)).toBe('radar')
    expect(emissionIntersectsTile(emissions[0], tile('shf'))).toBe(true)
    expect(emissionIntersectsTile(emissions[0], tile('uhf'))).toBe(false)
  })

  it('does not invent frequencies when capability has none', () => {
    const p = platform({
      id: 'bare',
      name: 'Bare',
      side: 'red',
      capabilities: [
        {
          id: 'c-bare',
          platform_id: 'bare',
          label: 'No freqs',
          layer: 'comms',
          axis: 'rf',
          fn: 'control',
        } satisfies SpectrumCapability,
      ],
    })
    expect(platformsToLaydownEmissions([p])).toHaveLength(0)
  })

  it('filters by side / provenance / type', () => {
    const red = platform({
      id: 'pcm-red',
      name: 'Red UAS',
      side: 'red',
      group: 1,
      confidence: 'derived',
      capabilities: [
        {
          id: 'c1',
          platform_id: 'pcm-red',
          label: 'C2',
          layer: 'comms',
          axis: 'rf',
          fn: 'control',
          freq_low_hz: 400e6,
          freq_high_hz: 600e6,
          derived: true,
        } satisfies SpectrumCapability,
      ],
    })
    const blue = platform({
      id: 'seed-blue',
      name: 'Blue Radar',
      side: 'blue',
      role: 'radar_ground',
      confidence: 'curated',
      capabilities: [
        {
          id: 'c2',
          platform_id: 'seed-blue',
          label: 'S-band',
          layer: 'radar',
          axis: 'rf',
          fn: 'radar_emit',
          freq_low_hz: 2e9,
          freq_high_hz: 4e9,
        } satisfies SpectrumCapability,
      ],
    })
    const emissions = platformsToLaydownEmissions([red, blue])
    const uhf = tile('uhf')
    const filters = {
      ...defaultBandTileFilters(),
      showBlue: false,
      includeCurated: false,
      includePcm: true,
    }
    const filtered = filterBandTileEmissions(uhf, emissions, filters)
    expect(filtered.every((e) => e.side === 'red')).toBe(true)
    expect(filtered.every((e) => e.derived)).toBe(true)
  })

  it('budgets dense brick lists', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      platform({
        id: `p-${i}`,
        name: `P${i}`,
        side: i % 2 === 0 ? 'red' : 'blue',
        group: 1,
        capabilities: [
          {
            id: `c-${i}`,
            platform_id: `p-${i}`,
            label: 'L',
            layer: 'comms',
            axis: 'rf',
            fn: 'control',
            freq_low_hz: 350e6 + i,
            freq_high_hz: 360e6 + i,
            derived: i > 10,
          } satisfies SpectrumCapability,
        ],
      }),
    )
    const emissions = platformsToLaydownEmissions(many)
    const { visible, truncated, total } = budgetEmissions(emissions, 40, false)
    expect(total).toBe(60)
    expect(truncated).toBe(true)
    expect(visible).toHaveLength(40)
    const all = budgetEmissions(emissions, 40, true)
    expect(all.visible).toHaveLength(60)
  })
})

describe('kindForSpectrumPlatform', () => {
  it('maps red radar to radar, not uas', () => {
    const p = platform({
      id: 'red-radar',
      name: 'Grave Stone',
      side: 'red',
      role: 'radar_ground',
      capabilities: [
        {
          id: 'r',
          platform_id: 'red-radar',
          label: 'X FC',
          layer: 'radar',
          axis: 'rf',
          fn: 'radar_emit',
          freq_low_hz: 8e9,
          freq_high_hz: 12e9,
        } satisfies SpectrumCapability,
      ],
    })
    expect(kindForSpectrumPlatform(p)).toBe('radar')
    expect(classifyAssetType(p)).toBe('radar')
  })

  it('maps red drone to uas and blue drone to cuas', () => {
    const red = platform({
      id: 'r-drone',
      name: 'Shahed',
      side: 'red',
      group: 2,
      capabilities: [],
    })
    const blue = platform({
      id: 'b-drone',
      name: 'Reaper',
      side: 'blue',
      group: 4,
      capabilities: [],
    })
    expect(kindForSpectrumPlatform(red)).toBe('uas')
    expect(kindForSpectrumPlatform(blue)).toBe('cuas')
  })

  it('maps EW jammer to effector regardless of side', () => {
    const p = platform({
      id: 'jam',
      name: 'Krasukha',
      side: 'red',
      role: 'ew',
      capabilities: [
        {
          id: 'j',
          platform_id: 'jam',
          label: 'Jam',
          layer: 'comms',
          axis: 'rf',
          fn: 'jam_datalink',
          freq_low_hz: 1e9,
          freq_high_hz: 2e9,
        } satisfies SpectrumCapability,
      ],
    })
    expect(kindForSpectrumPlatform(p)).toBe('effector')
  })
})
