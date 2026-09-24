// SPECTRAL: spectrum fratricide check (own jammers vs own drone links)
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
//
// For every own drone link (control, video, data, relay) this walks the flown
// route in time, and at each sample tests the link against every jammer whose
// band covers it:
//
//   J/S (dB) = [ERP_jammer - FSPL(jammer -> receiver)] - [ERP_tx - FSPL(tx -> receiver)]
//
// FSPL and the J/S -> effect curve are the existing EwPropagationEngine. The
// published effective range of the jammer is its footprint: inside it and above
// the J/S threshold the link is lost. Control is received by the drone; video is
// received at the far end (team ground station or relay). The far end at each
// sample is the nearest of the team ground station and any own relay on station.
//
// Free space, line of sight, isotropic antennas, no terrain. It is a planning
// screen, not an accredited EW model; every assumed number is reported back.

import { EwPropagationEngine } from './ewPropagationEngine'
import { COMMON_LINK_BANDS, type BandSource, type DroneLinkBand, type JamBand, type LinkKind } from './link-bands'

export type FratSide = 'red' | 'blue'
export type FratRole = 'isr' | 'strike' | 'relay' | 'multirole'
export type FratricideSeverity = 'high' | 'medium' | 'low'
export type ConflictKind = 'fratricide' | 'enemy_ew'

export interface GeoPoint {
  lon: number
  lat: number
  alt_m: number
}

export interface RoutePoint extends GeoPoint {
  speed_kmh: number
}

export interface FratricideDrone {
  id: string
  name: string
  side: FratSide
  role: FratRole
  /** Team ground control station (launch point). */
  launch: GeoPoint
  /** Flown route. Fewer than two points means the drone holds station at route[0] (or launch). */
  route: RoutePoint[]
  /** Launch time, minutes after H-hour. */
  launch_min: number
  fibre: boolean
  links: DroneLinkBand[]
  linkSource: BandSource
  /** A fibre-optic FPV is a sensible swap for this airframe (FPV strike class). */
  fpvCapable: boolean
}

export interface FratricideJammer {
  id: string
  name: string
  side: FratSide
  position: GeoPoint
  bands: JamBand[]
  erp_dbm: number
  erp_source: string
  /** Published effective range (m). */
  footprint_m: number
  quietWindows?: Array<{ start_min: number; end_min: number }>
  blankSectors?: Array<{ from_deg: number; to_deg: number }>
}

export interface FratricideOptions {
  ownSide: FratSide
  /** J/S at which the link is judged lost (50% effect point of the engine curve). */
  jsThreshold_db: number
  /** Ground station and relay transmitter ERP. */
  groundErp_dbm: number
  /** Drone transmitter ERP (video, telemetry). */
  droneErp_dbm: number
  sampleSpacing_m: number
  /** Beyond the published footprint but inside this multiple: reported as a low severity watch item. */
  watchFactor: number
  /** Minutes of margin either side of a sortie for jammer quiet windows. */
  windowPad_min: number
  /** Gaps shorter than this (min) between two runs on the same drone and jammer are merged. */
  mergeGap_min: number
  includeEnemyEw: boolean
}

export const DEFAULT_FRATRICIDE_OPTIONS: FratricideOptions = {
  ownSide: 'blue',
  jsThreshold_db: 10,
  groundErp_dbm: 30,
  droneErp_dbm: 27,
  sampleSpacing_m: 200,
  watchFactor: 1.5,
  windowPad_min: 2,
  mergeGap_min: 1,
  includeEnemyEw: true,
}

export type MitigationPatch =
  | { type: 'drone-link'; droneId: string; override: { kind: LinkKind; label: string; lo_mhz: number; hi_mhz: number } }
  | { type: 'drone-fibre'; droneId: string }
  | { type: 'jammer-quiet'; jammerId: string; window: { start_min: number; end_min: number } }
  | { type: 'jammer-blank'; jammerId: string; sector: { from_deg: number; to_deg: number } }
  | { type: 'relay-move'; droneId: string; lon: number; lat: number }

export interface Mitigation {
  id: string
  kind: 'band_shift' | 'jammer_window' | 'jammer_arc' | 'fibre' | 'move_relay'
  label: string
  detail: string
  patch: MitigationPatch
}

export interface ConflictSample {
  lon: number
  lat: number
  alt_m: number
  t_min: number
  severity: FratricideSeverity
}

export type ReceiverKind = 'drone' | 'ground' | 'relay'

export interface FratricideConflict {
  id: string
  kind: ConflictKind
  severity: FratricideSeverity
  droneId: string
  droneName: string
  droneRole: FratRole
  jammerId: string
  jammerName: string
  jammerSide: FratSide
  jammerPosition: GeoPoint
  /** Links affected in this window (control, video, data). */
  links: DroneLinkBand[]
  /** Jammer bands that cover them. */
  jamBands: JamBand[]
  /** Where each affected link is jammed. */
  receivers: ReceiverKind[]
  farEnd: { kind: 'ground' | 'relay'; id: string | null; name: string }
  t_start_min: number
  t_end_min: number
  /** Static drone (no route): the conflict holds for as long as both are up. */
  persistent: boolean
  entry: { lon: number; lat: number }
  exit: { lon: number; lat: number }
  /** Affected drone positions, in time order (for drawing). */
  path: ConflictSample[]
  /** Jammed receiver positions other than the drone itself (ground station, relay). */
  groundReceivers: GeoPoint[]
  max_js_db: number
  max_effect_pct: number
  min_jammer_distance_m: number
  footprint_m: number
  summary: string
  mitigations: Mitigation[]
}

export interface FratricideReport {
  conflicts: FratricideConflict[]
  counts: { fratricide: number; enemy: number; high: number; medium: number; low: number; dronesAffected: number }
  dronesChecked: number
  jammersChecked: number
  skipped: Array<{ id: string; name: string; reason: string }>
  assumptions: string[]
}

const R_EARTH = 6_371_000
const engine = new EwPropagationEngine()

function toRad(d: number) {
  return (d * Math.PI) / 180
}

export function groundDistanceM(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return R_EARTH * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function dist3d(a: GeoPoint, b: GeoPoint): number {
  return Math.hypot(groundDistanceM(a, b), (a.alt_m ?? 0) - (b.alt_m ?? 0))
}

export function bearingDeg(from: { lon: number; lat: number }, to: { lon: number; lat: number }): number {
  const p1 = toRad(from.lat)
  const p2 = toRad(to.lat)
  const dl = toRad(to.lon - from.lon)
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function destinationPoint(
  from: { lon: number; lat: number },
  bearing: number,
  distance_m: number,
): { lon: number; lat: number } {
  const d = distance_m / R_EARTH
  const th = toRad(bearing)
  const p1 = toRad(from.lat)
  const l1 = toRad(from.lon)
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th))
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2))
  return { lat: (p2 * 180) / Math.PI, lon: ((((l2 * 180) / Math.PI) + 540) % 360) - 180 }
}

export function inSector(bearing: number, sector: { from_deg: number; to_deg: number }): boolean {
  const b = ((bearing % 360) + 360) % 360
  const f = ((sector.from_deg % 360) + 360) % 360
  const t = ((sector.to_deg % 360) + 360) % 360
  return f <= t ? b >= f && b <= t : b >= f || b <= t
}

/** Minutes after H-hour as "H+12 min" or "H+1 h 05 min". Unambiguous next to clock times. */
export function formatHPlus(min: number): string {
  const total = Math.max(0, Math.round(min))
  if (total < 60) return `H+${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return `H+${h} h ${String(m).padStart(2, '0')} min`
}

function fmtKm(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function bandsOverlap(a: { lo_mhz: number; hi_mhz: number }, b: { lo_mhz: number; hi_mhz: number }): [number, number] | null {
  const lo = Math.max(a.lo_mhz, b.lo_mhz)
  const hi = Math.min(a.hi_mhz, b.hi_mhz)
  return hi >= lo ? [lo, hi] : null
}

interface Sample extends GeoPoint {
  t_min: number
}

/** Walk a route at a fixed spacing, timing each sample from leg speeds. */
export function sampleRoute(route: RoutePoint[], launch_min: number, spacing_m: number): Sample[] {
  if (route.length === 0) return []
  const out: Sample[] = [{ lon: route[0].lon, lat: route[0].lat, alt_m: route[0].alt_m, t_min: launch_min }]
  let t = launch_min
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]
    const b = route[i]
    const d = dist3d(a, b)
    const speed = Math.max(1, (a.speed_kmh + b.speed_kmh) / 2)
    const legMin = (d / 1000 / speed) * 60
    const n = Math.max(1, Math.ceil(d / Math.max(10, spacing_m)))
    for (let k = 1; k <= n; k++) {
      const f = k / n
      out.push({
        lon: a.lon + (b.lon - a.lon) * f,
        lat: a.lat + (b.lat - a.lat) * f,
        alt_m: a.alt_m + (b.alt_m - a.alt_m) * f,
        t_min: t + legMin * f,
      })
    }
    t += legMin
  }
  return out
}

interface FarEnd {
  kind: 'ground' | 'relay'
  id: string | null
  name: string
  point: GeoPoint
}

type TrackSample = Sample & { far: FarEnd }

function stationOf(d: FratricideDrone): GeoPoint {
  const last = d.route.length > 0 ? d.route[d.route.length - 1] : null
  return last ? { lon: last.lon, lat: last.lat, alt_m: last.alt_m } : d.launch
}

function isMoving(d: FratricideDrone): boolean {
  return d.route.length >= 2
}

interface Eval {
  js_db: number
  effect_pct: number
  jammerDist_m: number
  severity: FratricideSeverity | null
  receiver: ReceiverKind
  rxPoint: GeoPoint
}

function evaluateOne(
  jammer: FratricideJammer,
  band: JamBand,
  overlap: [number, number],
  rx: GeoPoint,
  tx: GeoPoint,
  txErp_dbm: number,
  receiver: ReceiverKind,
  opts: FratricideOptions,
): Eval {
  const dj = Math.max(10, dist3d(jammer.position, rx))
  const inFoot = dj <= jammer.footprint_m
  if (band.mode === 'hpm') {
    // HPM is an electronics effect on the airframe; it does not jam a ground receiver link.
    const hit = inFoot && receiver !== 'ground'
    return { js_db: hit ? 99 : -99, effect_pct: hit ? 100 : 0, jammerDist_m: dj, severity: hit ? 'high' : null, receiver, rxPoint: rx }
  }
  const dl = Math.max(10, dist3d(tx, rx))
  const f_hz = ((overlap[0] + overlap[1]) / 2) * 1e6
  const js = jammer.erp_dbm - engine.fsplDb(dj, f_hz) - (txErp_dbm - engine.fsplDb(dl, f_hz))
  const effect = engine.jsRatioToEffectPct(js, opts.jsThreshold_db)
  let severity: FratricideSeverity | null = null
  if (inFoot && effect >= 50) severity = 'high'
  else if (inFoot && effect >= 20) severity = 'medium'
  else if (dj <= jammer.footprint_m * opts.watchFactor && effect >= 50) severity = 'low'
  return { js_db: js, effect_pct: effect, jammerDist_m: dj, severity, receiver, rxPoint: rx }
}

const SEV_RANK: Record<FratricideSeverity, number> = { high: 3, medium: 2, low: 1 }

function worse(a: Eval | null, b: Eval | null): Eval | null {
  if (!a) return b
  if (!b) return a
  const ra = a.severity ? SEV_RANK[a.severity] : 0
  const rb = b.severity ? SEV_RANK[b.severity] : 0
  if (ra !== rb) return ra > rb ? a : b
  return a.js_db >= b.js_db ? a : b
}

function jammerSilent(j: FratricideJammer, t: number, rx: GeoPoint): boolean {
  if ((j.quietWindows ?? []).some((w) => t >= w.start_min && t <= w.end_min)) return true
  const sectors = j.blankSectors ?? []
  if (sectors.length > 0) {
    const b = bearingDeg(j.position, rx)
    if (sectors.some((s) => inSector(b, s))) return true
  }
  return false
}

const LINK_NOUN: Record<LinkKind, string> = { c2: 'control', video: 'video', datalink: 'data' }
const SEV_WORD: Record<FratricideSeverity, string> = { high: 'lost', medium: 'degraded', low: 'marginal' }

function linksPhrase(links: DroneLinkBand[]): string {
  const kinds = [...new Set(links.map((l) => l.kind))].sort((a, b) => ['c2', 'video', 'datalink'].indexOf(a) - ['c2', 'video', 'datalink'].indexOf(b))
  const words = kinds.map((k) => LINK_NOUN[k])
  if (words.length === 1) return `${words[0]} link`
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]} links`
}

function minimalArc(bearings: number[]): { from: number; to: number; width: number } {
  const bs = [...new Set(bearings.map((b) => Math.round(b * 10) / 10))].sort((a, b) => a - b)
  if (bs.length === 0) return { from: 0, to: 0, width: 360 }
  if (bs.length === 1) return { from: bs[0], to: bs[0], width: 0 }
  let maxGap = -1
  let gapIdx = 0
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i]
    const b = i === bs.length - 1 ? bs[0] + 360 : bs[i + 1]
    if (b - a > maxGap) {
      maxGap = b - a
      gapIdx = i
    }
  }
  return { from: bs[(gapIdx + 1) % bs.length], to: bs[gapIdx], width: 360 - maxGap }
}

/** One continuous run of affected samples for a single link and jam band. */
interface Run {
  kind: ConflictKind
  drone: FratricideDrone
  jammer: FratricideJammer
  link: DroneLinkBand
  band: JamBand
  persistent: boolean
  evals: Array<{ s: TrackSample; e: Eval }>
}

export function analyseFratricide(
  drones: FratricideDrone[],
  jammers: FratricideJammer[],
  options: Partial<FratricideOptions> = {},
): FratricideReport {
  const opts: FratricideOptions = { ...DEFAULT_FRATRICIDE_OPTIONS, ...options }
  const own = drones.filter((d) => d.side === opts.ownSide)
  const relays = own.filter((d) => d.role === 'relay')
  const nonRelays = own.filter((d) => d.role !== 'relay')
  const skipped: FratricideReport['skipped'] = []
  const assumptions = new Set<string>([
    'Free-space path loss, line of sight, isotropic antennas, no terrain masking.',
    `Link lost at a J/S of ${opts.jsThreshold_db} dB or more inside the jammer's published effective range.`,
    `Ground station and relay transmit at ${opts.groundErp_dbm} dBm (${(10 ** (opts.groundErp_dbm / 10) / 1000).toFixed(1)} W), drones at ${opts.droneErp_dbm} dBm (${(10 ** (opts.droneErp_dbm / 10) / 1000).toFixed(1)} W). Planning assumption.`,
  ])

  const activeJammers = jammers.filter((j) => {
    if (j.bands.length === 0) {
      skipped.push({ id: j.id, name: j.name, reason: 'No emission in drone link bands' })
      return false
    }
    if (j.side !== opts.ownSide && !opts.includeEnemyEw) return false
    if (j.erp_source === 'assumed') assumptions.add(`${j.name}: ERP ${j.erp_dbm.toFixed(0)} dBm assumed (no published figure).`)
    for (const b of j.bands) {
      if (b.source === 'template') assumptions.add(`${j.name}: bands from the app jammer template (2.4 GHz, 5.8 GHz, GNSS).`)
      if (b.source === 'assumed') assumptions.add(`${j.name}: ${b.label}, planning assumption.`)
    }
    return true
  })

  for (const d of own) {
    if (d.fibre) skipped.push({ id: d.id, name: d.name, reason: 'Fibre-optic link, nothing to jam' })
    else if (d.linkSource === 'assumed') assumptions.add(`${d.name}: link bands assumed (FPV default 900 MHz, 5.8 GHz, 2.4 GHz).`)
    else if (d.linkSource === 'estimated') assumptions.add(`${d.name}: link bands estimated from the airframe family.`)
  }

  // Team ground station for a relay = nearest own non-relay launch point.
  const relayGround = new Map<string, FarEnd>()
  for (const r of relays) {
    const st = stationOf(r)
    let best: FarEnd = { kind: 'ground', id: null, name: 'team ground station', point: r.launch }
    let bestD = isMoving(r) ? dist3d(r.launch, st) : Infinity
    for (const d of nonRelays) {
      const dd = dist3d(d.launch, st)
      if (dd < bestD) {
        bestD = dd
        best = { kind: 'ground', id: d.id, name: `${d.name} ground station`, point: d.launch }
      }
    }
    relayGround.set(r.id, best)
  }

  // Pass 1: far end per sample, and the window each relay is in use.
  type Track = { drone: FratricideDrone; samples: TrackSample[]; persistent: boolean }
  const tracks: Track[] = []
  const relayUse = new Map<string, { start: number; end: number }>()

  for (const d of nonRelays) {
    const moving = isMoving(d)
    const raw = moving ? sampleRoute(d.route, d.launch_min, opts.sampleSpacing_m) : [{ ...stationOf(d), t_min: d.launch_min }]
    // Repeaters extend FPV strike teams beyond line of sight; ISR and multi-role drones fly their own direct link.
    const usableRelays = d.role === 'strike' ? relays : []
    const samples = raw.map((p) => {
      let far: FarEnd = { kind: 'ground', id: null, name: 'team ground station', point: d.launch }
      let bestD = dist3d(d.launch, p)
      for (const r of usableRelays) {
        const st = stationOf(r)
        const dd = dist3d(st, p)
        if (dd < bestD) {
          bestD = dd
          far = { kind: 'relay', id: r.id, name: r.name, point: st }
        }
      }
      if (far.kind === 'relay' && far.id && moving) {
        const u = relayUse.get(far.id)
        relayUse.set(far.id, { start: Math.min(u?.start ?? Infinity, p.t_min), end: Math.max(u?.end ?? -Infinity, p.t_min) })
      }
      return { ...p, far }
    })
    tracks.push({ drone: d, samples, persistent: !moving })
  }

  for (const r of relays) {
    const st = stationOf(r)
    const ground = relayGround.get(r.id)!
    const use = relayUse.get(r.id)
    let samples: TrackSample[]
    let persistent = false
    if (use && Number.isFinite(use.start)) {
      samples = []
      for (let t = Math.floor(use.start); t <= Math.ceil(use.end); t += 1) samples.push({ ...st, t_min: t, far: ground })
    } else {
      samples = [{ ...st, t_min: r.launch_min, far: ground }]
      persistent = true
    }
    tracks.push({ drone: r, samples, persistent })
  }

  // Jammers each drone passes near (for band-shift viability).
  const nearJammers = new Map<string, FratricideJammer[]>()
  for (const tr of tracks) {
    nearJammers.set(
      tr.drone.id,
      activeJammers.filter((j) =>
        tr.samples.some(
          (s) =>
            dist3d(j.position, s) <= j.footprint_m * opts.watchFactor ||
            dist3d(j.position, s.far.point) <= j.footprint_m * opts.watchFactor,
        ),
      ),
    )
  }

  // Pass 2: runs of affected samples per link and jam band.
  const runs: Run[] = []
  for (const tr of tracks) {
    const d = tr.drone
    if (d.fibre) continue
    const isRelay = d.role === 'relay'
    for (const j of activeJammers) {
      const kind: ConflictKind = j.side === opts.ownSide ? 'fratricide' : 'enemy_ew'
      for (const link of d.links) {
        for (const band of j.bands) {
          const ov = band.mode === 'hpm' ? ([link.lo_mhz, link.hi_mhz] as [number, number]) : bandsOverlap(link, band)
          if (!ov) continue
          let current: Run | null = null
          for (const s of tr.samples) {
            const dronePt: GeoPoint = { lon: s.lon, lat: s.lat, alt_m: s.alt_m }
            const far = s.far.point
            const up = () =>
              jammerSilent(j, s.t_min, dronePt)
                ? null
                : evaluateOne(j, band, ov, dronePt, far, opts.groundErp_dbm, isRelay ? 'relay' : 'drone', opts)
            const down = () =>
              jammerSilent(j, s.t_min, far)
                ? null
                : evaluateOne(j, band, ov, far, dronePt, opts.droneErp_dbm, !isRelay && s.far.kind === 'relay' ? 'relay' : 'ground', opts)
            const e =
              link.kind === 'c2' ? up() : link.kind === 'video' && !isRelay ? down() : worse(up(), down())
            if (e?.severity) {
              if (!current) {
                current = { kind, drone: d, jammer: j, link, band, persistent: tr.persistent, evals: [] }
                runs.push(current)
              }
              current.evals.push({ s, e })
            } else {
              current = null
            }
          }
        }
      }
    }
  }

  // Pass 3: merge runs on the same drone and jammer whose windows touch.
  const byPair = new Map<string, Run[]>()
  for (const r of runs) {
    const key = `${r.kind}|${r.drone.id}|${r.jammer.id}`
    byPair.set(key, [...(byPair.get(key) ?? []), r])
  }

  const conflicts: FratricideConflict[] = []
  for (const group of byPair.values()) {
    const sorted = [...group].sort((a, b) => a.evals[0].s.t_min - b.evals[0].s.t_min)
    const clusters: Run[][] = []
    for (const r of sorted) {
      const start = r.evals[0].s.t_min
      const last = clusters[clusters.length - 1]
      const lastEnd = last ? Math.max(...last.map((x) => x.evals[x.evals.length - 1].s.t_min)) : -Infinity
      if (last && start <= lastEnd + opts.mergeGap_min) last.push(r)
      else clusters.push([r])
    }
    clusters.forEach((cluster, idx) => conflicts.push(buildConflict(cluster, idx, nearJammers, opts)))
  }

  const list = conflicts.sort(
    (a, b) =>
      (a.kind === b.kind ? 0 : a.kind === 'fratricide' ? -1 : 1) ||
      SEV_RANK[b.severity] - SEV_RANK[a.severity] ||
      a.t_start_min - b.t_start_min ||
      a.droneName.localeCompare(b.droneName),
  )

  return {
    conflicts: list,
    counts: {
      fratricide: list.filter((c) => c.kind === 'fratricide').length,
      enemy: list.filter((c) => c.kind === 'enemy_ew').length,
      high: list.filter((c) => c.severity === 'high').length,
      medium: list.filter((c) => c.severity === 'medium').length,
      low: list.filter((c) => c.severity === 'low').length,
      dronesAffected: new Set(list.filter((c) => c.kind === 'fratricide').map((c) => c.droneId)).size,
    },
    dronesChecked: own.length,
    jammersChecked: activeJammers.length,
    skipped,
    assumptions: [...assumptions],
  }
}

function buildConflict(
  cluster: Run[],
  idx: number,
  nearJammers: Map<string, FratricideJammer[]>,
  opts: FratricideOptions,
): FratricideConflict {
  const { kind, drone, jammer, persistent } = cluster[0]
  const all = cluster.flatMap((r) => r.evals)
  const worst = all.reduce((acc, cur) => (worse(acc.e, cur.e) === cur.e ? cur : acc), all[0])

  const links: DroneLinkBand[] = []
  const jamBands: JamBand[] = []
  for (const r of cluster) {
    if (!links.some((l) => l.kind === r.link.kind && l.lo_mhz === r.link.lo_mhz)) links.push(r.link)
    if (!jamBands.some((b) => b.lo_mhz === r.band.lo_mhz && b.hi_mhz === r.band.hi_mhz)) jamBands.push(r.band)
  }

  // Drone path: one sample per time step, worst severity at that step.
  const byT = new Map<number, ConflictSample>()
  for (const { s, e } of all) {
    const key = Math.round(s.t_min * 1000)
    const prev = byT.get(key)
    if (!prev || SEV_RANK[e.severity!] > SEV_RANK[prev.severity]) {
      byT.set(key, { lon: s.lon, lat: s.lat, alt_m: s.alt_m, t_min: s.t_min, severity: e.severity! })
    }
  }
  const path = [...byT.values()].sort((a, b) => a.t_min - b.t_min)

  const groundReceivers: GeoPoint[] = []
  for (const { e } of all) {
    if (e.receiver === 'drone' || (drone.role === 'relay' && e.receiver === 'relay')) continue
    if (!groundReceivers.some((p) => groundDistanceM(p, e.rxPoint) < 5)) groundReceivers.push(e.rxPoint)
  }

  const conflict: FratricideConflict = {
    id: `${kind}:${drone.id}:${jammer.id}:${idx}`,
    kind,
    severity: worst.e.severity!,
    droneId: drone.id,
    droneName: drone.name,
    droneRole: drone.role,
    jammerId: jammer.id,
    jammerName: jammer.name,
    jammerSide: jammer.side,
    jammerPosition: jammer.position,
    links,
    jamBands,
    receivers: [...new Set(all.map(({ e }) => e.receiver))],
    farEnd: { kind: worst.s.far.kind, id: worst.s.far.id, name: worst.s.far.name },
    t_start_min: path[0].t_min,
    t_end_min: path[path.length - 1].t_min,
    persistent,
    entry: { lon: path[0].lon, lat: path[0].lat },
    exit: { lon: path[path.length - 1].lon, lat: path[path.length - 1].lat },
    path,
    groundReceivers,
    max_js_db: Math.max(...all.map(({ e }) => e.js_db)),
    max_effect_pct: Math.max(...all.map(({ e }) => e.effect_pct)),
    min_jammer_distance_m: Math.min(...all.map(({ e }) => e.jammerDist_m)),
    footprint_m: jammer.footprint_m,
    summary: '',
    mitigations: [],
  }
  conflict.summary = describe(conflict, worst.e)
  conflict.mitigations = mitigationsFor(
    conflict,
    drone,
    jammer,
    nearJammers.get(drone.id) ?? [],
    all.map(({ e }) => e.rxPoint),
    all.filter(({ e }) => e.receiver === 'relay').map(({ s, e }) => (drone.role === 'relay' ? e.rxPoint : s.far.point)),
    opts,
  )
  return conflict
}

function describe(c: FratricideConflict, worst: Eval): string {
  const who = c.kind === 'fratricide' ? `own ${c.jammerName}` : `enemy ${c.jammerName}`
  const when = c.persistent
    ? `while on station from ${formatHPlus(c.t_start_min)}`
    : Math.round(c.t_end_min) === Math.round(c.t_start_min)
      ? `at ${formatHPlus(c.t_start_min)}`
      : `from ${formatHPlus(c.t_start_min)} to ${formatHPlus(c.t_end_min)}`
  const where =
    worst.receiver === 'drone'
      ? `${fmtKm(worst.jammerDist_m)} from the jammer`
      : worst.receiver === 'relay'
        ? `at ${c.droneRole === 'relay' ? 'the relay station' : c.farEnd.name}, ${fmtKm(worst.jammerDist_m)} from the jammer`
        : `at the ground station, ${fmtKm(worst.jammerDist_m)} from the jammer`
  return `${c.droneName} ${linksPhrase(c.links)} ${SEV_WORD[c.severity]} to ${who} ${when}, ${where}.`
}

function mitigationsFor(
  c: FratricideConflict,
  drone: FratricideDrone,
  jammer: FratricideJammer,
  near: FratricideJammer[],
  rxPoints: GeoPoint[],
  relayPoints: GeoPoint[],
  opts: FratricideOptions,
): Mitigation[] {
  const out: Mitigation[] = []
  const hpmNear = near.some((j) => j.bands.some((b) => b.mode === 'hpm'))

  // 1. Shift each affected link to a band no nearby jammer covers.
  if (!hpmNear) {
    const covered = (b: { lo_mhz: number; hi_mhz: number }) => near.some((j) => j.bands.some((jb) => bandsOverlap(b, jb)))
    for (const link of c.links) {
      const candidate = COMMON_LINK_BANDS.find(
        (b) => b.kinds.includes(link.kind) && !bandsOverlap(b, link) && !covered(b),
      )
      if (!candidate) continue
      const noun = LINK_NOUN[link.kind]
      out.push({
        id: `${c.id}:band:${link.kind}`,
        kind: 'band_shift',
        label: `Move ${drone.name} ${noun} link to ${candidate.label}`,
        detail: `No jammer on this route covers ${candidate.label}. Check the radio supports it before the sortie.`,
        patch: {
          type: 'drone-link',
          droneId: drone.id,
          override: {
            kind: link.kind,
            label: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${candidate.label} (band shift)`,
            lo_mhz: candidate.lo_mhz,
            hi_mhz: candidate.hi_mhz,
          },
        },
      })
    }
  }

  if (c.kind === 'fratricide') {
    // 2. Hold the jammer silent for the sortie window.
    if (!c.persistent) {
      const start = Math.max(0, Math.floor(c.t_start_min - opts.windowPad_min))
      const end = Math.ceil(c.t_end_min + opts.windowPad_min)
      out.push({
        id: `${c.id}:window`,
        kind: 'jammer_window',
        label: `Hold ${jammer.name} silent ${formatHPlus(start)} to ${formatHPlus(end)}`,
        detail: `Covers the ${drone.name} window with ${opts.windowPad_min} min either side. That site loses this jammer for ${end - start} min.`,
        patch: { type: 'jammer-quiet', jammerId: jammer.id, window: { start_min: start, end_min: end } },
      })
    }

    // 3. Blank the jammer sector that faces the affected receivers.
    const arc = minimalArc(rxPoints.map((p) => bearingDeg(jammer.position, p)))
    const pad = 10
    const width = arc.width + pad * 2
    if (width <= 180) {
      const from = Math.round((((arc.from - pad) % 360) + 360) % 360)
      const to = Math.round((((arc.to + pad) % 360) + 360) % 360)
      out.push({
        id: `${c.id}:arc`,
        kind: 'jammer_arc',
        label: `Blank ${jammer.name} from ${String(from).padStart(3, '0')}° to ${String(to).padStart(3, '0')}°`,
        detail: `Needs a directional antenna or sector blanking. Keeps ${Math.round(360 - width)}° of the jammer arc.`,
        patch: { type: 'jammer-blank', jammerId: jammer.id, sector: { from_deg: from, to_deg: to } },
      })
    }
  }

  // 4. Fibre-optic FPV for this section.
  if (drone.fpvCapable && drone.role !== 'relay' && drone.role !== 'isr') {
    out.push({
      id: `${c.id}:fibre`,
      kind: 'fibre',
      label: `Fly ${drone.name} on a fibre-optic FPV`,
      detail: 'No RF link to jam. Range is limited by the spool; confirm it reaches the target.',
      patch: { type: 'drone-fibre', droneId: drone.id },
    })
  }

  // 5. Move the relay out of the footprint (only when a relay is the jammed receiver).
  if (relayPoints.length > 0) {
    const relayId = drone.role === 'relay' ? drone.id : c.farEnd.kind === 'relay' ? c.farEnd.id : null
    const relayName = drone.role === 'relay' ? drone.name : c.farEnd.kind === 'relay' ? c.farEnd.name : null
    const station = drone.role === 'relay' ? stationOf(drone) : relayPoints[0]
    if (relayId && relayName) {
      const b = bearingDeg(jammer.position, station)
      const standoff = jammer.footprint_m * opts.watchFactor * 1.1
      const current = groundDistanceM(jammer.position, station)
      if (current < standoff) {
        const p = destinationPoint(jammer.position, b, standoff)
        out.push({
          id: `${c.id}:relay`,
          kind: 'move_relay',
          label: `Move ${relayName} ${fmtKm(standoff - current)} further from ${jammer.name}`,
          detail: `New station ${p.lat.toFixed(4)}, ${p.lon.toFixed(4)} sits ${fmtKm(standoff)} from the jammer, outside its watch ring. Check the relay still reaches the team.`,
          patch: { type: 'relay-move', droneId: relayId, lon: p.lon, lat: p.lat },
        })
      }
    }
  }

  return out
}
