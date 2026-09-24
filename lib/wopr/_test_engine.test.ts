import { describe, expect, it } from 'vitest'
import {
  advanceScenario,
  createDefaultWorldState,
  dayNightAt,
  movePlatforms,
  sunElevationDeg,
  TURN_MINUTES,
} from '@/lib/wopr/engine'
import { buildSensorPicture, haversineKm } from '@/lib/wopr/fog-of-war'
import { mulberry32 } from '@/lib/wopr/fires-loop'
import type { WoprPlatform, WoprScenario } from '@/lib/wopr/types'

function plat(o: Partial<WoprPlatform> & Pick<WoprPlatform, 'id' | 'side'>): WoprPlatform {
  return {
    name: o.id,
    lat: 0,
    lon: 0,
    alt_m: 0,
    platform_type: 'generic',
    radiating: true,
    destroyed: false,
    ...o,
  }
}

function scenarioWith(red: WoprPlatform[], blue: WoprPlatform[]): WoprScenario {
  const world = createDefaultWorldState()
  world.red_orbat.platforms = red
  world.blue_orbat.platforms = blue
  return {
    id: 's',
    tenant_id: 't',
    name: 'S',
    classification: 'UNCLASSIFIED',
    world_state: world,
    elapsed_min: 0,
    status: 'draft',
  }
}

describe('sunElevationDeg', () => {
  it('puts the sun high at local noon and below the horizon at midnight', () => {
    // Canberra, midsummer: noon AEDT is about 01:00Z.
    expect(sunElevationDeg(new Date('2026-12-21T01:30:00Z'), -35.28, 149.13)).toBeGreaterThan(60)
    expect(sunElevationDeg(new Date('2026-12-21T13:30:00Z'), -35.28, 149.13)).toBeLessThan(-20)
  })
})

describe('dayNightAt', () => {
  it('uses the sun when a start time is set', () => {
    const s = scenarioWith([plat({ id: 'r', side: 'red', lat: -22.6, lon: 150.5 })], [])
    s.world_state.battlespace.start_time_utc = '2027-08-12T20:00:00Z' // 06:00 AEST
    expect(dayNightAt(s.world_state, 0)).toBe('night')
    expect(dayNightAt(s.world_state, 120)).toBe('day')
  })

  it('falls back to night from T+60 without a start time', () => {
    const s = scenarioWith([], [])
    expect(dayNightAt(s.world_state, 45)).toBe('day')
    expect(dayNightAt(s.world_state, 60)).toBe('night')
  })
})

describe('movePlatforms', () => {
  it('moves along the route at planning speed and reports arrival once', () => {
    const s = scenarioWith(
      [
        plat({
          id: 'owa',
          side: 'red',
          lat: 0,
          lon: 0,
          speed_kmh: 100,
          route: [{ lat: 0.3, lon: 0, label: 'Aim point', note: 'Not adjudicated' }],
        }),
      ],
      [],
    )
    const w = s.world_state
    const start = { lat: 0, lon: 0 }
    const r1 = movePlatforms(w, TURN_MINUTES) // 25 km of ~33 km
    const p = w.red_orbat.platforms[0]
    expect(haversineKm(start.lat, start.lon, p.lat, p.lon)).toBeCloseTo(25, 0)
    expect(r1).toHaveLength(0)
    const r2 = movePlatforms(w, TURN_MINUTES)
    expect(p.lat).toBeCloseTo(0.3, 6)
    expect(r2).toHaveLength(1)
    expect(r2[0]).toMatchObject({ type: 'arrive', entity_id: 'owa' })
    expect(r2[0].detail).toBe('owa reached Aim point. Not adjudicated')
    expect(movePlatforms(w, TURN_MINUTES)).toHaveLength(0)
  })

  it('leaves platforms without a route where they are', () => {
    const s = scenarioWith([plat({ id: 'x', side: 'red', lat: 1, lon: 1 })], [])
    movePlatforms(s.world_state, TURN_MINUTES)
    expect(s.world_state.red_orbat.platforms[0]).toMatchObject({ lat: 1, lon: 1 })
  })
})

describe('buildSensorPicture', () => {
  const observer = plat({ id: 'obs', side: 'blue', lat: 0, lon: 0 })
  const emitter = plat({ id: 'emit', side: 'red', lat: 0.1, lon: 0 }) // ~11 km
  const silent = plat({ id: 'quiet', side: 'red', lat: 0.1, lon: 0, radiating: false })

  it('hears emitters within range and cannot find silent targets without radar or EO/IR', () => {
    const pic = buildSensorPicture([observer], [emitter, silent], 30, mulberry32(1))
    expect(pic.map((t) => t.id)).toEqual(['emit'])
    expect(pic[0].source).toBe('sigint')
  })

  it('finds silent targets with radar inside its own range only', () => {
    const radar = { ...observer, sensor: 'radar' as const, sensor_range_km: 12 }
    expect(buildSensorPicture([radar], [silent], 30, mulberry32(1)).map((t) => t.source)).toEqual(['radar'])
    const shortRadar = { ...radar, sensor_range_km: 5 }
    expect(buildSensorPicture([shortRadar], [silent], 30, mulberry32(1))).toHaveLength(0)
  })

  it('keeps legacy sigint observers able to find silent targets', () => {
    const legacy = { ...observer, platform_type: 'sigint' }
    expect(buildSensorPicture([legacy], [silent], 30, mulberry32(1))).toHaveLength(1)
  })
})

describe('advanceScenario', () => {
  it('records detections as gains and losses between turns', () => {
    const blue = plat({ id: 'b', side: 'blue', lat: 0, lon: 0 })
    const red = plat({ id: 'r', side: 'red', name: 'Red jammer', lat: 0.1, lon: 0 })
    const s0 = scenarioWith([red], [blue])
    const t1 = advanceScenario(s0, { random: mulberry32(3), now: new Date(0) })
    const gains = t1.tick.records!.filter((r) => r.type === 'detect' && r.side === 'blue')
    expect(gains.map((r) => r.entity)).toEqual(['Red jammer'])
    expect(t1.tick.events).toEqual(t1.tick.records!.map((r) => r.detail))
    expect(t1.tick.events.join(' ')).not.toMatch(/—/) // no em dashes in the log

    // Red goes silent: Blue loses the track next turn.
    t1.scenario.world_state.red_orbat.platforms[0].radiating = false
    const t2 = advanceScenario(t1.scenario, { random: mulberry32(4), now: new Date(0) })
    expect(t2.tick.records!.some((r) => r.type === 'lost' && r.entity === 'Red jammer')).toBe(true)
    expect(t2.tick.turn).toBe(2)
    expect(t2.scenario.status).toBe('running')
  })
})
