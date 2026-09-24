import { buildSensorPicture, haversineKm } from '@/lib/wopr/fog-of-war'
import type {
  SensorTrack,
  TickResult,
  WoprEventRecord,
  WoprPlatform,
  WorldState,
  WoprScenario,
} from '@/lib/wopr/types'

export const TURN_MINUTES = 15

/** Sensor ranges the engine gives each side (km). Planning assumptions. */
export const RED_SENSOR_RANGE_KM = 25
export const BLUE_SENSOR_RANGE_KM = 30

export function createDefaultWorldState(): WorldState {
  return {
    battlespace: {
      terrain: 'mixed_urban',
      weather: { wind_kts: 12, visibility_km: 8, cloud_base_ft: 4000 },
      time: { mission_elapsed_min: 0, day_night: 'day' },
    },
    red_orbat: { platforms: [] },
    blue_orbat: { platforms: [] },
    comms_status: {},
  }
}

/**
 * Approximate solar elevation (degrees) from the NOAA simplified equations.
 * Good to well under a degree, which is all a day/night switch needs.
 */
export function sunElevationDeg(at: Date, lat: number, lon: number): number {
  const rad = Math.PI / 180
  const dayMs = 86_400_000
  const jd = at.getTime() / dayMs + 2440587.5
  const n = jd - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * rad
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad
  const epsilon = (23.439 - 0.0000004 * n) * rad
  const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda))
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda))
  const gmstHours = (18.697374558 + 24.06570982441908 * n) % 24
  const lstRad = ((gmstHours * 15 + lon) % 360) * rad
  const hourAngle = lstRad - ra
  const latR = lat * rad
  const sinAlt =
    Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle)
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad
}

function worldCentre(world: WorldState): { lat: number; lon: number } | null {
  const all = [...world.red_orbat.platforms, ...world.blue_orbat.platforms]
  if (all.length === 0) return null
  return {
    lat: all.reduce((s, p) => s + p.lat, 0) / all.length,
    lon: all.reduce((s, p) => s + p.lon, 0) / all.length,
  }
}

/**
 * Day or night at the given mission time. With a start time and a laydown the
 * sun decides; without one the legacy rule applies (night from T+60).
 */
export function dayNightAt(world: WorldState, elapsedMin: number): 'day' | 'night' {
  const start = world.battlespace.start_time_utc
  const centre = worldCentre(world)
  if (start && centre) {
    const at = new Date(Date.parse(start) + elapsedMin * 60_000)
    if (!Number.isNaN(at.getTime())) {
      return sunElevationDeg(at, centre.lat, centre.lon) > -0.833 ? 'day' : 'night'
    }
  }
  if (elapsedMin >= 60) return 'night'
  return world.battlespace.time.day_night
}

/** Move a point toward another by `km` along the great circle (small-distance approximation). */
function stepToward(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  km: number,
): { lat: number; lon: number; arrived: boolean } {
  const d = haversineKm(from.lat, from.lon, to.lat, to.lon)
  if (d <= km || d === 0) return { lat: to.lat, lon: to.lon, arrived: true }
  const f = km / d
  return {
    lat: from.lat + (to.lat - from.lat) * f,
    lon: from.lon + (to.lon - from.lon) * f,
    arrived: false,
  }
}

/**
 * Advance every routed platform by one turn at its planning speed. Mutates
 * `world` and returns movement records. Platforms without a route or speed
 * stay where they are, which is how every pre-route scenario behaves.
 */
export function movePlatforms(world: WorldState, minutes: number): WoprEventRecord[] {
  const records: WoprEventRecord[] = []
  const progress = { ...(world.route_progress ?? {}) }
  const all = [...world.red_orbat.platforms, ...world.blue_orbat.platforms]
  for (const p of all) {
    if (p.destroyed || !p.route?.length || !p.speed_kmh || p.speed_kmh <= 0) continue
    let idx = progress[p.id] ?? 0
    if (idx >= p.route.length) continue
    let budget = (p.speed_kmh * minutes) / 60
    while (budget > 0 && idx < p.route.length) {
      const wp = p.route[idx]
      const before = haversineKm(p.lat, p.lon, wp.lat, wp.lon)
      const step = stepToward(p, wp, budget)
      p.lat = step.lat
      p.lon = step.lon
      if (!step.arrived) break
      budget -= before
      idx++
      if (idx >= p.route.length) {
        records.push({
          type: 'arrive',
          side: p.side,
          entity_id: p.id,
          entity: p.name,
          detail: `${p.name} reached ${wp.label ?? 'the end of its route'}${wp.note ? `. ${wp.note}` : ''}`,
        })
      }
    }
    progress[p.id] = idx
  }
  world.route_progress = progress
  return records
}

function detectionRecords(
  observer: 'red' | 'blue',
  picture: SensorTrack[],
  previous: string[] | undefined,
  names: Map<string, string>,
): WoprEventRecord[] {
  const out: WoprEventRecord[] = []
  const now = new Set(picture.map((t) => t.id))
  const before = new Set(previous ?? [])
  const who = observer === 'blue' ? 'Blue' : 'Red'
  const sourceLabel: Record<SensorTrack['source'], string> = {
    sigint: 'SIGINT',
    radar: 'radar',
    eo_ir: 'EO/IR',
    report: 'report',
  }
  for (const t of picture) {
    if (before.has(t.id)) continue
    out.push({
      type: 'detect',
      side: observer,
      entity_id: t.id,
      entity: t.name,
      detail: `${who} gains ${t.name} (${sourceLabel[t.source]}, ${t.confidence} confidence)`,
    })
  }
  for (const id of before) {
    if (now.has(id)) continue
    const name = names.get(id) ?? id
    out.push({
      type: 'lost',
      side: observer,
      entity_id: id,
      entity: name,
      detail: `${who} loses track of ${name}`,
    })
  }
  return out
}

export interface AdvanceOptions {
  random?: () => number
  now?: Date
}

export function advanceScenario(
  scenario: WoprScenario,
  options: AdvanceOptions = {},
): { scenario: WoprScenario; tick: TickResult } {
  const random = options.random ?? Math.random
  const world = structuredClone(scenario.world_state) as WorldState
  const turn = Math.floor(world.battlespace.time.mission_elapsed_min / TURN_MINUTES) + 1
  world.battlespace.time.mission_elapsed_min += TURN_MINUTES
  world.last_tick_at = (options.now ?? new Date()).toISOString()
  const elapsed = world.battlespace.time.mission_elapsed_min

  const records: WoprEventRecord[] = [
    {
      type: 'turn',
      side: 'referee',
      detail: `Turn ${turn}: ${TURN_MINUTES} min elapsed, adjudicating ORBAT propagation pairs`,
    },
  ]

  records.push(...movePlatforms(world, TURN_MINUTES))

  const redPlatforms = world.red_orbat.platforms
  const bluePlatforms = world.blue_orbat.platforms

  // A side's picture is what its own sensors hold on the other side:
  // blue_picture = Red tracks held by Blue observers, and the reverse.
  // (Before Sep 2026 the observer and target arguments were swapped here, so
  // each "picture" listed the side's own units as seen by the enemy.)
  const bluePicture = buildSensorPicture(bluePlatforms, redPlatforms, BLUE_SENSOR_RANGE_KM, random)
  const redPicture = buildSensorPicture(redPlatforms, bluePlatforms, RED_SENSOR_RANGE_KM, random)

  const names = new Map<string, string>()
  for (const p of [...redPlatforms, ...bluePlatforms] as WoprPlatform[]) names.set(p.id, p.name)
  records.push(...detectionRecords('blue', bluePicture, world.held_tracks?.blue, names))
  records.push(...detectionRecords('red', redPicture, world.held_tracks?.red, names))
  world.held_tracks = {
    blue: bluePicture.map((t) => t.id),
    red: redPicture.map((t) => t.id),
  }

  const was = world.battlespace.time.day_night
  const next = dayNightAt(world, elapsed)
  if (next !== was) {
    world.battlespace.time.day_night = next
    records.push({
      type: 'phase',
      side: 'referee',
      detail:
        next === 'night'
          ? 'Night transition: EO/IR advantage shifts'
          : 'First light: optical sensors regain range',
    })
  }

  const updated: WoprScenario = {
    ...scenario,
    elapsed_min: elapsed,
    world_state: world,
    status: scenario.status === 'draft' ? 'running' : scenario.status,
  }

  return {
    scenario: updated,
    tick: {
      elapsed_min: elapsed,
      turn,
      red_picture: redPicture,
      blue_picture: bluePicture,
      events: records.map((r) => r.detail),
      records,
      propagation_refreshed: false,
    },
  }
}
