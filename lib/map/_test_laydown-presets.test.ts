import { describe, expect, it } from 'vitest'
import { allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import { toMapCuasAsset, toMapUasAsset } from '@/lib/map/asset-mappers'
import { getSpectraMapAssets } from '@/lib/map/spectra-assets'
import {
  buildPresetLaydown,
  ensurePresetFallbackAssets,
  GENERIC_RF_JAMMER_ID,
  LAYDOWN_PRESETS,
} from '@/lib/map/laydown-presets'
import { applyMitigationPatch, clearMitigations, runLaydownFratricide } from '@/lib/map/fratricide-adapter'
import { hostileLaydownFor, resolveCuasSide, resolveUasRole, resolveUasSide } from '@/lib/map/laydown-sides'
import { OFFLINE_DEFEAT_SYSTEMS } from '@/lib/pcm/defeat-matrix-offline-data'
import type { AntiDroneSystem } from '@/lib/types'
import type { MapAssetsPayload, PlacedUas } from '@/lib/map/types'

function catalog(extraCuas: Partial<AntiDroneSystem>[] = []): MapAssetsPayload {
  const s = getSpectraMapAssets()
  return {
    uas: allA3dmPlatforms().map(toMapUasAsset),
    cuas: [...OFFLINE_DEFEAT_SYSTEMS, ...(extraCuas as AntiDroneSystem[])].map(toMapCuasAsset),
    radars: s.radars,
    effectors: s.effectors,
  }
}

describe('laydown sides', () => {
  const asset = toMapUasAsset(allA3dmPlatforms()[0])
  const base: PlacedUas = {
    instanceId: 'uas-1',
    asset,
    lon: 0,
    lat: 0,
    terrainAMSL: 0,
    discAltitude_m: 100,
    lateralRadius_m: 1000,
    ceilingAMSL_m: 200,
    annotationTime_min: 0,
    effectiveRange_km: 1,
    infoPanelClosed: true,
  }
  it('resolves side: explicit, then id token, then catalogue, else Red', () => {
    expect(resolveUasSide({ ...base, side: 'blue' })).toBe('blue')
    expect(resolveUasSide({ ...base, instanceId: 'ts27-blue-fpv-a1' })).toBe('blue')
    expect(resolveUasSide({ ...base, instanceId: 'vig-nqld-red-1' })).toBe('red')
    expect(resolveUasSide({ ...base, asset: { ...asset, side: 'blue' } })).toBe('blue')
    expect(resolveUasSide(base)).toBe('red')
    // Random placement ids never carry a side token by accident.
    expect(resolveUasSide({ ...base, instanceId: 'uas-1727140000000-ab3xz' })).toBe('red')
  })
  it('resolves role from id tokens', () => {
    expect(resolveUasRole({ ...base, instanceId: 'ts27-blue-relay-a' })).toBe('relay')
    expect(resolveUasRole({ ...base, instanceId: 'ts27-blue-fpv-a1' })).toBe('strike')
  })
  it('C-UAS default to Blue; a red token makes an OPFOR jammer', () => {
    expect(resolveCuasSide({ instanceId: 'cuas-1' })).toBe('blue')
    expect(resolveCuasSide({ instanceId: 'ts27-red-jammer' })).toBe('red')
  })
})

describe('presets', () => {
  it('builds every preset from the offline catalogue with labelled stand-ins', () => {
    for (const { id } of LAYDOWN_PRESETS) {
      const p = buildPresetLaydown(id, catalog())
      expect(p.placedUas.length + p.placedCuas.length).toBeGreaterThan(0)
      for (const item of [...p.placedUas, ...p.placedCuas, ...p.placedRadars, ...p.placedEffectors]) {
        expect(Number.isFinite(item.lon) && Number.isFinite(item.lat)).toBe(true)
      }
      expect(p.name).not.toMatch(/—/)
    }
  })

  it('combat team: Blue drone teams, relays, own C-UAS and a Red jammer at Shoalwater Bay', () => {
    const p = buildPresetLaydown('combat-team', catalog())
    const blue = p.placedUas.filter((u) => resolveUasSide(u) === 'blue')
    const red = p.placedUas.filter((u) => resolveUasSide(u) === 'red')
    expect(blue.map((u) => resolveUasRole(u)).sort()).toEqual(['isr', 'multirole', 'relay', 'relay', 'strike', 'strike'])
    expect(red.length).toBe(2)
    expect(p.placedCuas.some((c) => resolveCuasSide(c) === 'red')).toBe(true)
    // SWBTA is around 22.5 S 150.5 E.
    for (const u of p.placedUas) {
      expect(u.lat).toBeGreaterThan(-22.8)
      expect(u.lat).toBeLessThan(-22.4)
      expect(u.lon).toBeGreaterThan(150.3)
      expect(u.lon).toBeLessThan(150.6)
    }
    // DroneBuster is not in the offline catalogue: generic stand-in, real name kept on the label.
    const buster = p.placedCuas.find((c) => c.instanceId === 'ts27-blue-dronebuster')!
    expect(buster.asset.id).toBe(GENERIC_RF_JAMMER_ID)
    expect(buster.callsign).toBe('Coy HQ DroneBuster (assumed specs)')
    expect(p.resolution.find((r) => r.wanted.startsWith('DroneBuster'))?.fallback).toBe(true)
  })

  it('uses a catalogue row by name when one exists', () => {
    const p = buildPresetLaydown(
      'combat-team',
      catalog([
        {
          id: 'dronebuster-live',
          name: 'DZYNE DroneBuster',
          defeat_method: ['RF_jamming'],
          frequency_bands_covered_mhz: {},
          effective_range_m: 1500,
        },
      ]),
    )
    const buster = p.placedCuas.find((c) => c.instanceId === 'ts27-blue-dronebuster')!
    expect(buster.asset.id).toBe('dronebuster-live')
    expect(buster.callsign).toBe('Coy HQ DroneBuster')
  })

  it('combat team produces own-jammer conflicts that mitigations can clear', () => {
    const p = buildPresetLaydown('combat-team', catalog())
    const report = runLaydownFratricide(p.placedUas, p.placedCuas)
    expect(report.counts.fratricide).toBeGreaterThan(0)
    expect(report.skipped.some((s) => /Passive sensor/.test(s.reason))).toBe(true)

    let state = { placedUas: p.placedUas, placedCuas: p.placedCuas }
    const first = report.conflicts.find((c) => c.kind === 'fratricide' && c.mitigations.some((m) => m.kind === 'jammer_window'))!
    const win = first.mitigations.find((m) => m.kind === 'jammer_window')!
    state = applyMitigationPatch(state, win.patch)
    const after = runLaydownFratricide(state.placedUas, state.placedCuas)
    expect(after.conflicts.find((c) => c.id === first.id && c.t_start_min === first.t_start_min)).toBeUndefined()

    const cleared = clearMitigations(state)
    expect(cleared.placedCuas.every((c) => !c.emcon)).toBe(true)
  })

  it('fibre mitigation removes the drone from the check', () => {
    const p = buildPresetLaydown('combat-team', catalog())
    const report = runLaydownFratricide(p.placedUas, p.placedCuas)
    const fpvConflict = report.conflicts.find((c) => c.droneId === 'ts27-blue-fpv-a1' && c.mitigations.some((m) => m.kind === 'fibre'))!
    const fibre = fpvConflict.mitigations.find((m) => m.kind === 'fibre')!
    const state = applyMitigationPatch({ placedUas: p.placedUas, placedCuas: p.placedCuas }, fibre.patch)
    const after = runLaydownFratricide(state.placedUas, state.placedCuas)
    expect(after.conflicts.some((c) => c.droneId === 'ts27-blue-fpv-a1')).toBe(false)
  })

  it('own drones plan only against opposing threats', () => {
    const p = buildPresetLaydown('combat-team', catalog())
    const fpv = p.placedUas.find((u) => u.instanceId === 'ts27-blue-fpv-a1')!
    const hostile = hostileLaydownFor(fpv, p.placedCuas, p.placedRadars, p.placedEffectors)
    expect(hostile.cuas.every((c) => resolveCuasSide(c) === 'red')).toBe(true)
    expect(hostile.radars).toHaveLength(0) // EchoGuard is own
  })

  it('Al Minhad gets its eight-drone raid even on the offline catalogue (dossier stand-in)', () => {
    const p = buildPresetLaydown('al-minhad', catalog())
    expect(p.placedUas).toHaveLength(8)
    expect(p.placedUas.every((u) => u.asset.id === 'shahed-136' && resolveUasSide(u) === 'red')).toBe(true)
    expect(p.placedUas[0].asset.max_speed_kmh).toBe(185)
    // Raid launches are staggered over 12 minutes.
    expect(Math.max(...p.placedUas.map((u) => u.launchTime_min ?? 0))).toBeCloseTo(10.5)
    expect(p.placedEffectors.length).toBeGreaterThan(0)
  })

  it('folds the generic stand-ins into the catalogue once', () => {
    const c = ensurePresetFallbackAssets(catalog())
    expect(c.cuas.filter((x) => x.id === GENERIC_RF_JAMMER_ID)).toHaveLength(1)
    expect(ensurePresetFallbackAssets(c)).toBe(c)
  })
})
