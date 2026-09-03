/**
 * Turns a live WOPR scenario into a printable commander's brief.
 *
 * Pure data — no React — so the shape is testable under node and the same
 * model can later feed a DOCX/AFSIM exporter without touching the renderer.
 *
 * The centrepiece is the detection delta: for each side, which opposing
 * platforms they actually hold versus what is really out there. That gap is
 * the product's whole argument, so the brief states it numerically.
 */

import type { SensorTrack, TickResult, WoprPlatform, WoprScenario } from '@/lib/wopr/types'

export interface BriefOrbatRow {
  id: string
  name: string
  side: 'red' | 'blue'
  platformType: string
  lat: number
  lon: number
  altM: number
  radiating: boolean
  destroyed: boolean
}

export interface BriefDetectionRow {
  targetId: string
  targetName: string
  detected: boolean
  confidence: SensorTrack['confidence'] | null
  source: SensorTrack['source'] | null
}

export interface BriefSideDetection {
  observer: 'red' | 'blue'
  rows: BriefDetectionRow[]
  detectedCount: number
  totalCount: number
  /** 0-100, rounded. 100 means the observer holds every live opposing platform. */
  coveragePct: number
}

export interface ScenarioBrief {
  title: string
  classification: string
  generatedAt: string
  elapsedMin: number
  status: string
  battlespace: {
    terrain: string
    windKts: number
    visibilityKm: number
    cloudBaseFt: number
    dayNight: 'day' | 'night'
  }
  orbat: { red: BriefOrbatRow[]; blue: BriefOrbatRow[] }
  detection: { blueSeesRed: BriefSideDetection; redSeesBlue: BriefSideDetection }
  comms: { id: string; state: 'up' | 'degraded' | 'down' }[]
  events: string[]
}

function toRow(p: WoprPlatform): BriefOrbatRow {
  return {
    id: p.id,
    name: p.name,
    side: p.side,
    platformType: p.platform_type,
    lat: p.lat,
    lon: p.lon,
    altM: p.alt_m,
    radiating: p.radiating,
    destroyed: p.destroyed,
  }
}

/** Tracks carry names rather than platform ids, so match on normalised name. */
function normalise(s: string): string {
  return s.trim().toLowerCase()
}

function buildSideDetection(
  observer: 'red' | 'blue',
  opposing: WoprPlatform[],
  picture: SensorTrack[],
): BriefSideDetection {
  const byName = new Map<string, SensorTrack>()
  for (const t of picture) byName.set(normalise(t.name), t)

  // A destroyed platform is no longer an intelligence problem — exclude it so
  // coverage is not flattered by kills.
  const live = opposing.filter((p) => !p.destroyed)

  const rows: BriefDetectionRow[] = live.map((p) => {
    const hit = byName.get(normalise(p.name))
    return {
      targetId: p.id,
      targetName: p.name,
      detected: !!hit,
      confidence: hit?.confidence ?? null,
      source: hit?.source ?? null,
    }
  })

  const detectedCount = rows.filter((r) => r.detected).length
  return {
    observer,
    rows,
    detectedCount,
    totalCount: rows.length,
    coveragePct: rows.length === 0 ? 100 : Math.round((detectedCount / rows.length) * 100),
  }
}

export function buildScenarioBrief(
  scenario: WoprScenario,
  tick: TickResult | null,
  now: Date = new Date(),
): ScenarioBrief {
  const ws = scenario.world_state
  const red = ws.red_orbat.platforms
  const blue = ws.blue_orbat.platforms

  return {
    title: scenario.name,
    classification: scenario.classification,
    generatedAt: now.toISOString(),
    elapsedMin: scenario.elapsed_min,
    status: scenario.status,
    battlespace: {
      terrain: ws.battlespace.terrain,
      windKts: ws.battlespace.weather.wind_kts,
      visibilityKm: ws.battlespace.weather.visibility_km,
      cloudBaseFt: ws.battlespace.weather.cloud_base_ft,
      dayNight: ws.battlespace.time.day_night,
    },
    orbat: { red: red.map(toRow), blue: blue.map(toRow) },
    detection: {
      blueSeesRed: buildSideDetection('blue', red, tick?.blue_picture ?? []),
      redSeesBlue: buildSideDetection('red', blue, tick?.red_picture ?? []),
    },
    comms: Object.entries(ws.comms_status).map(([id, state]) => ({ id, state })),
    events: tick?.events ?? [],
  }
}

/** Filename for the printed/saved brief — safe across filesystems. */
export function briefFilename(brief: ScenarioBrief): string {
  const slug = brief.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const stamp = brief.generatedAt.slice(0, 16).replace(/[^0-9]/g, '')
  return `spectral-brief-${slug || 'scenario'}-${stamp}`
}
