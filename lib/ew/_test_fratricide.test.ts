import { describe, expect, it } from 'vitest'
import {
  analyseFratricide,
  bearingDeg,
  destinationPoint,
  formatHPlus,
  inSector,
  sampleRoute,
  type FratricideDrone,
  type FratricideJammer,
  type MitigationPatch,
} from '@/lib/ew/fratricide'
import type { DroneLinkBand, JamBand } from '@/lib/ew/link-bands'

const C2_900: DroneLinkBand = { kind: 'c2', label: 'Control 900 MHz', lo_mhz: 902, hi_mhz: 928, source: 'assumed' }
const VID_58: DroneLinkBand = { kind: 'video', label: 'Video 5.8 GHz', lo_mhz: 5725, hi_mhz: 5875, source: 'assumed' }
const JAM_WIDE: JamBand = { label: 'jam 400 MHz to 6 GHz', lo_mhz: 400, hi_mhz: 6000, mode: 'jam', source: 'assumed' }
const JAM_24: JamBand = { label: 'Jam 2.4 GHz', lo_mhz: 2400, hi_mhz: 2483.5, mode: 'jam', source: 'curated' }

// Launch at the origin, fly 10 km due east at 60 km/h (1 km per minute).
const ORIGIN = { lon: 150.4, lat: -22.6, alt_m: 62 }
const tenKmEast = destinationPoint(ORIGIN, 90, 10_000)

function drone(over: Partial<FratricideDrone> = {}): FratricideDrone {
  return {
    id: 'fpv-1',
    name: 'FPV A1',
    side: 'blue',
    role: 'strike',
    launch: ORIGIN,
    route: [
      { ...ORIGIN, alt_m: 62, speed_kmh: 60 },
      { lon: tenKmEast.lon, lat: tenKmEast.lat, alt_m: 180, speed_kmh: 60 },
    ],
    launch_min: 10,
    fibre: false,
    links: [C2_900, VID_58],
    linkSource: 'assumed',
    fpvCapable: true,
    ...over,
  }
}

function jammer(over: Partial<FratricideJammer> = {}): FratricideJammer {
  const at = destinationPoint(ORIGIN, 180, 300) // 300 m south of the ground station
  return {
    id: 'jam-1',
    name: 'DroneBuster',
    side: 'blue',
    position: { lon: at.lon, lat: at.lat, alt_m: 62 },
    bands: [JAM_WIDE],
    erp_dbm: 40,
    erp_source: 'assumed',
    footprint_m: 2000,
    ...over,
  }
}

describe('geometry helpers', () => {
  it('bearing and destination round-trip', () => {
    const p = destinationPoint(ORIGIN, 45, 5000)
    expect(bearingDeg(ORIGIN, p)).toBeCloseTo(45, 0)
  })
  it('sector test wraps through north', () => {
    expect(inSector(355, { from_deg: 340, to_deg: 20 })).toBe(true)
    expect(inSector(10, { from_deg: 340, to_deg: 20 })).toBe(true)
    expect(inSector(180, { from_deg: 340, to_deg: 20 })).toBe(false)
  })
  it('H+ time format is unambiguous', () => {
    expect(formatHPlus(12.4)).toBe('H+12 min')
    expect(formatHPlus(65)).toBe('H+1 h 05 min')
  })
  it('route sampling times each sample from leg speed', () => {
    const s = sampleRoute(drone().route, 10, 500)
    expect(s[0].t_min).toBe(10)
    // 10 km at 60 km/h is 10 minutes (plus a small vertical component).
    expect(s[s.length - 1].t_min).toBeGreaterThan(19.9)
    expect(s[s.length - 1].t_min).toBeLessThan(20.2)
  })
})

describe('analyseFratricide', () => {
  it('flags an own wideband jammer next to the team ground station', () => {
    const r = analyseFratricide([drone()], [jammer()])
    expect(r.counts.fratricide).toBeGreaterThan(0)
    const c = r.conflicts[0]
    expect(c.kind).toBe('fratricide')
    expect(c.severity).toBe('high')
    expect(c.droneName).toBe('FPV A1')
    // Video is received at the ground station, which sits 300 m from the jammer.
    expect(c.receivers).toContain('ground')
    expect(c.t_start_min).toBeGreaterThanOrEqual(10)
    expect(c.summary).toMatch(/FPV A1 .*lost to own DroneBuster/)
    expect(c.summary).not.toMatch(/—/)
  })

  it('does not flag a jammer whose bands miss the links', () => {
    const r = analyseFratricide([drone()], [jammer({ bands: [JAM_24] })])
    expect(r.conflicts).toHaveLength(0)
  })

  it('skips fibre-optic drones', () => {
    const r = analyseFratricide([drone({ fibre: true, links: [] })], [jammer()])
    expect(r.conflicts).toHaveLength(0)
    expect(r.skipped.map((s) => s.reason)).toContain('Fibre-optic link, nothing to jam')
  })

  it('ignores jammers far outside the footprint', () => {
    const far = destinationPoint(ORIGIN, 270, 40_000)
    const r = analyseFratricide([drone()], [jammer({ position: { ...far, alt_m: 62 } })])
    expect(r.conflicts).toHaveLength(0)
  })

  it('a quiet window over the sortie clears the conflict (mitigation round-trip)', () => {
    const r = analyseFratricide([drone()], [jammer()])
    const c = r.conflicts[0]
    const m = c.mitigations.find((x) => x.kind === 'jammer_window')
    expect(m).toBeDefined()
    const patch = m!.patch as Extract<MitigationPatch, { type: 'jammer-quiet' }>
    expect(patch.window.start_min).toBeLessThanOrEqual(c.t_start_min)
    expect(patch.window.end_min).toBeGreaterThanOrEqual(c.t_end_min)
    const after = analyseFratricide([drone()], [jammer({ quietWindows: [patch.window] })])
    expect(after.conflicts.filter((x) => x.jammerId === 'jam-1')).toHaveLength(0)
  })

  it('a blanked sector facing the receivers clears the conflict', () => {
    const r = analyseFratricide([drone()], [jammer()])
    const m = r.conflicts[0].mitigations.find((x) => x.kind === 'jammer_arc')
    expect(m).toBeDefined()
    const patch = m!.patch as Extract<MitigationPatch, { type: 'jammer-blank' }>
    const after = analyseFratricide([drone()], [jammer({ blankSectors: [patch.sector] })])
    expect(after.conflicts).toHaveLength(0)
  })

  it('offers a band shift only when a common band is uncovered, and the shift clears it', () => {
    const narrow = jammer({ bands: [{ ...JAM_24 }, { label: 'Jam 5.8 GHz', lo_mhz: 5725, hi_mhz: 5875, mode: 'jam', source: 'curated' }] })
    const d = drone({ links: [VID_58] })
    const r = analyseFratricide([d], [narrow])
    const shift = r.conflicts[0].mitigations.find((x) => x.kind === 'band_shift')
    expect(shift).toBeDefined()
    const patch = shift!.patch as Extract<MitigationPatch, { type: 'drone-link' }>
    expect(patch.override.kind).toBe('video')
    const moved: DroneLinkBand = { kind: 'video', label: patch.override.label, lo_mhz: patch.override.lo_mhz, hi_mhz: patch.override.hi_mhz, source: 'override' }
    expect(analyseFratricide([drone({ links: [moved] })], [narrow]).conflicts).toHaveLength(0)

    // A 400 MHz to 6 GHz jammer leaves no common band free.
    const wide = analyseFratricide([d], [jammer()])
    expect(wide.conflicts[0].mitigations.some((x) => x.kind === 'band_shift')).toBe(false)
  })

  it('reports enemy jammers as enemy EW without jammer-control mitigations', () => {
    const target = destinationPoint(ORIGIN, 90, 9_500)
    const red = jammer({ id: 'red-1', name: 'OPFOR EW', side: 'red', position: { ...target, alt_m: 62 }, erp_dbm: 53, footprint_m: 15_000 })
    const r = analyseFratricide([drone()], [red])
    expect(r.counts.fratricide).toBe(0)
    expect(r.counts.enemy).toBeGreaterThan(0)
    const c = r.conflicts[0]
    expect(c.kind).toBe('enemy_ew')
    expect(c.mitigations.some((m) => m.kind === 'jammer_window' || m.kind === 'jammer_arc')).toBe(false)
    expect(analyseFratricide([drone()], [red], { includeEnemyEw: false }).conflicts).toHaveLength(0)
  })

  it('only checks own-side drones', () => {
    const r = analyseFratricide([drone({ side: 'red' })], [jammer()])
    expect(r.dronesChecked).toBe(0)
    expect(r.conflicts).toHaveLength(0)
  })

  it('handles a relay held near an own jammer and proposes moving it', () => {
    const relayAt = destinationPoint(ORIGIN, 90, 6000)
    const gunAt = destinationPoint(relayAt, 0, 600)
    const relay = drone({
      id: 'relay-a',
      name: 'Relay A',
      role: 'relay',
      launch: { ...relayAt, alt_m: 62 },
      route: [{ ...relayAt, alt_m: 200, speed_kmh: 0 }],
      launch_min: 5,
      fpvCapable: false,
    })
    const fpv = drone({ route: [{ ...ORIGIN, speed_kmh: 60 }, { ...destinationPoint(ORIGIN, 90, 14_000), alt_m: 150, speed_kmh: 60 }] })
    const gun = jammer({ id: 'gun', name: 'DroneGun', position: { ...gunAt, alt_m: 62 }, footprint_m: 1000, erp_dbm: 37, bands: [JAM_WIDE] })
    const r = analyseFratricide([fpv, relay], [gun])
    const relayConflict = r.conflicts.find((c) => c.droneId === 'relay-a')
    expect(relayConflict).toBeDefined()
    // Relay use is timed from the FPV sortie, not the whole exercise.
    expect(relayConflict!.persistent).toBe(false)
    const move = relayConflict!.mitigations.find((m) => m.kind === 'move_relay')
    expect(move).toBeDefined()
    const patch = move!.patch as Extract<MitigationPatch, { type: 'relay-move' }>
    const movedRelay = drone({ ...relay, route: [{ lon: patch.lon, lat: patch.lat, alt_m: 200, speed_kmh: 0 }] })
    const after = analyseFratricide([fpv, movedRelay], [gun])
    expect(after.conflicts.find((c) => c.droneId === 'relay-a' && c.receivers.includes('relay'))).toBeUndefined()
  })

  it('treats HPM as an electronics effect inside its footprint regardless of band', () => {
    const hpm = jammer({ bands: [{ label: 'HPM', lo_mhz: 300, hi_mhz: 18_000, mode: 'hpm', source: 'curated' }], footprint_m: 2000 })
    const r = analyseFratricide([drone({ links: [{ ...C2_900 }] })], [hpm])
    expect(r.conflicts).toHaveLength(1)
    expect(r.conflicts[0].severity).toBe('high')
    expect(r.conflicts[0].receivers).toEqual(['drone'])
  })

  it('merges control and video on the same drone and jammer into one conflict', () => {
    const r = analyseFratricide([drone()], [jammer()])
    const pair = r.conflicts.filter((c) => c.droneId === 'fpv-1' && c.jammerId === 'jam-1')
    expect(pair).toHaveLength(1)
    expect(pair[0].links.map((l) => l.kind).sort()).toEqual(['c2', 'video'])
  })

  it('lists assumptions for assumed bands and ERP', () => {
    const r = analyseFratricide([drone()], [jammer()])
    expect(r.assumptions.join(' ')).toMatch(/Free-space path loss/)
    expect(r.assumptions.join(' ')).toMatch(/FPV A1: link bands assumed/)
    expect(r.assumptions.join(' ')).toMatch(/DroneBuster: ERP 40 dBm assumed/)
  })
})
