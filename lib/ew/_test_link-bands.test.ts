import { describe, expect, it } from 'vitest'
import { parseLinkText, resolveDroneLinks, resolveJammerProfile } from '@/lib/ew/link-bands'
import { GENERIC_PRESET_CUAS, GENERIC_RF_DETECTOR_ID, GENERIC_RF_JAMMER_ID } from '@/lib/map/laydown-presets'
import type { MapCuasAsset, MapUasAsset } from '@/lib/map/types'

const uas = (over: Partial<MapUasAsset> = {}): MapUasAsset => ({
  id: 'unknown-fpv-xyz',
  name: 'Unknown FPV',
  slug: 'unknown-fpv-xyz',
  category: 'FPV' as MapUasAsset['category'],
  categoryLabel: 'FPV',
  image_url: null,
  max_altitude_agl_m: 300,
  altitude_reference: 'AGL',
  max_range_km: 15,
  max_speed_kmh: 120,
  endurance_min: 10,
  climb_rate_mpm: 500,
  ...over,
})

const cuas = (over: Partial<MapCuasAsset>): MapCuasAsset => ({
  id: 'x',
  name: 'X',
  categoryLabel: 'RF Jamming',
  image_url: null,
  defeat_range_m: 2000,
  defeat_range_km: 2,
  defeat_methods: ['RF_jamming'],
  ...over,
})

describe('parseLinkText', () => {
  it('reads ISM pairs and fibre', () => {
    expect(parseLinkText('2.4 / 5.8 GHz class COTS C2').mhz).toEqual([2400, 5800])
    expect(parseLinkText('900 MHz ELRS').mhz).toEqual([900])
    expect(parseLinkText('fibre-optic').fibre).toBe(true)
    expect(parseLinkText(null).mhz).toEqual([])
  })
})

describe('resolveDroneLinks', () => {
  it('falls back to the labelled FPV default when the catalogue has nothing', () => {
    const p = resolveDroneLinks(uas())
    expect(p.source).toBe('assumed')
    expect(p.links.map((l) => l.kind)).toEqual(['c2', 'video', 'datalink'])
    expect(p.links[0]).toMatchObject({ lo_mhz: 902, hi_mhz: 928 })
    expect(p.links.every((l) => /assumed/.test(l.label))).toBe(true)
  })

  it('uses platform-library frequencies when present', () => {
    const p = resolveDroneLinks(uas({ c2_mhz: [868] }))
    expect(p.source).toBe('catalogue')
    expect(p.links[0]).toMatchObject({ kind: 'c2', lo_mhz: 863, hi_mhz: 870 })
  })

  it('parses the control link text (lower band control, 5.8 GHz video)', () => {
    const p = resolveDroneLinks(uas({ control_link_freq: '2.4 / 5.8 GHz ISM' }))
    expect(p.links.find((l) => l.kind === 'c2')).toMatchObject({ lo_mhz: 2400 })
    expect(p.links.find((l) => l.kind === 'video')).toMatchObject({ lo_mhz: 5725 })
  })

  it('honours fibre and band overrides from the link plan', () => {
    expect(resolveDroneLinks(uas(), { fibre: true }).fibre).toBe(true)
    const p = resolveDroneLinks(uas(), { overrides: [{ kind: 'video', label: 'Video 1.3 GHz', lo_mhz: 1240, hi_mhz: 1300 }] })
    expect(p.links.filter((l) => l.kind === 'video')).toEqual([
      { kind: 'video', label: 'Video 1.3 GHz', lo_mhz: 1240, hi_mhz: 1300, source: 'override' },
    ])
  })
})

describe('resolveJammerProfile', () => {
  it('reads curated jam bands and OSINT ERP for DroneGun Tactical', () => {
    const p = resolveJammerProfile(cuas({ id: 'dronegun-tactical', name: 'DroneGun Tactical' }))
    expect(p.emits).toBe(true)
    expect(p.bands.some((b) => b.lo_mhz === 902)).toBe(true)
    expect(p.erp_source).toBe('osint-db')
    expect(Math.round(p.erp_dbm)).toBe(37) // 5 W
  })

  it('treats the generic stand-in as a labelled planning assumption', () => {
    const generic = GENERIC_PRESET_CUAS.find((c) => c.id === GENERIC_RF_JAMMER_ID)!
    const p = resolveJammerProfile(generic)
    expect(p.bands).toEqual([expect.objectContaining({ lo_mhz: 400, hi_mhz: 6000, source: 'assumed' })])
    expect(p.erp_source).toBe('assumed')
  })

  it('never lets a passive detector radiate', () => {
    const det = GENERIC_PRESET_CUAS.find((c) => c.id === GENERIC_RF_DETECTOR_ID)!
    const p = resolveJammerProfile(det)
    expect(p.emits).toBe(false)
    expect(p.passive).toBe(true)
  })

  it('uses catalogue band tables and ignores radar keys', () => {
    const p = resolveJammerProfile(
      cuas({
        id: 'lmadis-test',
        name: 'Test LMADIS',
        bands_mhz: [
          { label: 'jammer_ISM_24_ghz', lo_mhz: 2400, hi_mhz: 2500 },
          { label: 'S_band_primary_mhz', lo_mhz: 2700, hi_mhz: 3100 },
        ],
      }),
    )
    expect(p.bands.map((b) => b.lo_mhz)).toEqual([2400])
    expect(p.bands[0].source).toBe('catalogue')
  })

  it('falls back to the app jammer template when an RF jammer has no band table', () => {
    const p = resolveJammerProfile(cuas({ id: 'zz-unknown', name: 'Zz Unknown Jammer' }))
    expect(p.bands.every((b) => b.source === 'template')).toBe(true)
  })

  it('kinetic effectors do not emit and are not passive sensors', () => {
    const p = resolveJammerProfile(cuas({ id: 'zz-gun', name: 'Zz Gun', defeat_methods: ['kinetic'] }))
    expect(p.emits).toBe(false)
    expect(p.passive).toBe(false)
  })
})
