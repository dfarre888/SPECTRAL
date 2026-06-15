import { describe, expect, it } from 'vitest'
import { getSpectraMapAssets } from '@/lib/map/spectra-assets'

describe('getSpectraMapAssets', () => {
  it('loads radars and effectors from SPECTRA seed', () => {
    const { radars, effectors } = getSpectraMapAssets()
    expect(radars.length).toBeGreaterThan(0)

    const thaad = effectors.find((e) => e.id === 'eff-thaad')
    expect(thaad).toBeDefined()
    expect(thaad!.linkedRadars.length).toBeGreaterThan(0)
    expect(thaad!.cueing_radar_ids.length).toBeGreaterThan(0)

    const patriot = effectors.find((e) => e.id === 'eff-patriot-pac3')
    expect(patriot).toBeDefined()
  })
})
