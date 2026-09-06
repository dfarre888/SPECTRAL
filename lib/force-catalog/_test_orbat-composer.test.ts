import { describe, expect, it } from 'vitest'
import {
  BAND_ORDER,
  composeOrbat,
  diffRollups,
  sortBands,
  type ComposerPlatform,
} from '@/lib/force-catalog/orbat-composer'

const plat = (
  id: string,
  comms: { kind: string; standard?: string | null; band?: string | null }[] = [],
  sensors: { band: string | null; kind?: string }[] = [],
): ComposerPlatform => ({
  id,
  label: id,
  domain: 'air',
  role: 'multirole',
  comms: comms.map((c) => ({ kind: c.kind, standard: c.standard ?? null, band: c.band ?? null })),
  sensors,
})

const L16 = { kind: 'datalink', standard: 'link16', band: 'L' }
const MADL = { kind: 'datalink', standard: 'madl', band: 'Ku' }
const UHF = { kind: 'voice_uhf' }
const HF = { kind: 'voice_hf' }
const SAT = { kind: 'data_satcom' }

const FORCE: ComposerPlatform[] = [
  plat('f35', [L16, MADL, UHF], [{ band: 'X', kind: 'radar' }, { band: 'IR', kind: 'eo_ir' }]),
  plat('e7a', [L16, UHF, HF, SAT], [{ band: 'L', kind: 'radar' }]),
  plat('bushmaster', [UHF]),
  plat('truck', []),
]
const ALL = new Set(FORCE.map((p) => p.id))

describe('band ordering', () => {
  it('reads low frequency to high, not alphabetically', () => {
    expect(sortBands(['X', 'HF', 'Ku', 'UHF'])).toEqual(['HF', 'UHF', 'X', 'Ku'])
  })
  it('puts unknown bands last rather than dropping them', () => {
    expect(sortBands(['ZZZ', 'HF'])).toEqual(['HF', 'ZZZ'])
  })
  it('covers the bands the catalogue actually uses', () => {
    for (const b of ['HF', 'VHF', 'UHF', 'L', 'X', 'Ku']) expect(BAND_ORDER).toContain(b)
  })
})

describe('comms band rollup', () => {
  it('counts platforms per band', () => {
    const r = composeOrbat(FORCE, ALL)
    const byBand = Object.fromEntries(r.commsBands.map((b) => [b.band, b.platformCount]))
    expect(byBand.UHF).toBe(3)   // f35, e7a, bushmaster
    expect(byBand.L).toBe(2)     // link16 on f35 and e7a
    expect(byBand.HF).toBe(1)    // e7a only
    expect(byBand.Ku).toBe(2)    // madl on f35, satcom on e7a
  })

  it('derives a band from the bearer kind when no band field is set', () => {
    const r = composeOrbat([plat('x', [UHF, HF])], new Set(['x']))
    expect(r.commsBands.map((b) => b.band)).toEqual(['HF', 'UHF'])
  })

  it('counts a platform once per band however many bearers it has there', () => {
    const r = composeOrbat([plat('x', [L16, { kind: 'datalink', standard: 'link11', band: 'L' }])], new Set(['x']))
    expect(r.commsBands.find((b) => b.band === 'L')!.platformCount).toBe(1)
  })

  it('records which bearer kinds occupy each band', () => {
    const r = composeOrbat(FORCE, ALL)
    expect(r.commsBands.find((b) => b.band === 'Ku')!.kinds).toEqual(['data_satcom', 'datalink'])
  })
})

describe('single points of failure', () => {
  it('flags a band held by exactly one platform', () => {
    const r = composeOrbat(FORCE, ALL)
    // Only the E-7A carries HF.
    expect(r.singlePointBands).toContain('HF')
    expect(r.singlePointBands).not.toContain('UHF')
  })

  it('stops flagging once a second platform covers the band', () => {
    const withSecondHf = [...FORCE, plat('p8a', [HF])]
    const r = composeOrbat(withSecondHf, new Set(withSecondHf.map((p) => p.id)))
    expect(r.singlePointBands).not.toContain('HF')
  })
})

describe('connectivity tiers', () => {
  it('assigns each platform its best tier', () => {
    const r = composeOrbat(FORCE, ALL)
    expect(r.tiers.track).toBe(2)  // f35, e7a
    expect(r.tiers.voice).toBe(1)  // bushmaster
    expect(r.tiers.none).toBe(1)   // truck
  })

  it('does not count a voice-only platform as disconnected', () => {
    const r = composeOrbat([plat('b', [UHF])], new Set(['b']))
    expect(r.tiers.none).toBe(0)
    expect(r.tiers.voice).toBe(1)
  })
})

describe('sensor rollup and gaps', () => {
  it('rolls up sensor bands', () => {
    const r = composeOrbat(FORCE, ALL)
    expect(r.sensorBands.map((b) => b.band)).toEqual(['L', 'X', 'IR'])
  })

  it('names platforms with nothing recorded', () => {
    const r = composeOrbat(FORCE, ALL)
    expect(r.noCommsIds).toEqual(['truck'])
    expect(r.noSensorIds).toEqual(['bushmaster', 'truck'])
  })
})

describe('selection', () => {
  it('only counts selected platforms', () => {
    const r = composeOrbat(FORCE, new Set(['bushmaster']))
    expect(r.selectedCount).toBe(1)
    expect(r.totalCount).toBe(4)
    expect(r.commsBands.map((b) => b.band)).toEqual(['UHF'])
  })

  it('returns an empty rollup when nothing is selected', () => {
    const r = composeOrbat(FORCE, new Set())
    expect(r.selectedCount).toBe(0)
    expect(r.commsBands).toEqual([])
    expect(r.tiers).toEqual({ track: 0, data: 0, voice: 0, none: 0 })
  })
})

describe('delta between compositions', () => {
  it('names the band lost when the only holder is dropped', () => {
    const before = composeOrbat(FORCE, ALL)
    const after = composeOrbat(FORCE, new Set(['f35', 'bushmaster', 'truck']))
    const d = diffRollups(before, after)
    // Dropping the E-7A takes HF with it.
    expect(d.bandsLost).toContain('HF')
    expect(d.trackDelta).toBe(-1)
    expect(d.selectedDelta).toBe(-1)
  })

  it('names a band gained when a platform is added back', () => {
    const before = composeOrbat(FORCE, new Set(['bushmaster']))
    const after = composeOrbat(FORCE, new Set(['bushmaster', 'e7a']))
    const d = diffRollups(before, after)
    expect(d.bandsGained).toEqual(['HF', 'L', 'Ku'])
    expect(d.trackDelta).toBe(1)
  })

  it('reports no change when composition is unchanged', () => {
    const r = composeOrbat(FORCE, ALL)
    expect(diffRollups(r, r)).toEqual({ bandsLost: [], bandsGained: [], trackDelta: 0, selectedDelta: 0 })
  })
})
