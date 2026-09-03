/**
 * Threat-aware route planning.
 *
 * A great-circle leg ignores the fact that the airspace has opinions. This
 * plans a path that trades length against cumulative exposure.
 *
 * The formulation that makes it tractable: survival across independent
 * exposures multiplies,
 *
 *     P(survive) = product over segments of exp(-hazard_i * dt_i)
 *
 * so taking negative log turns it into a sum,
 *
 *     -ln P(survive) = sum of hazard_i * dt_i
 *
 * which is additive and non-negative — exactly what a shortest-path search
 * needs. Minimising accumulated hazard therefore maximises survival exactly,
 * with no heuristic weighting between the two.
 *
 * Three things shape the hazard field:
 *
 *   Range      — outside detection range an emitter contributes nothing.
 *   Aspect     — a pulse-Doppler radar rejects targets whose radial velocity
 *                falls in its clutter notch. A target flying tangentially has
 *                near-zero radial velocity and is filtered out. This is the
 *                notch, and it is why a route bends rather than beelines.
 *   Terrain    — masked ground contributes nothing, which is what makes the
 *                viewshed work worth doing.
 *
 * The notch is not free: flying perpendicular to an emitter maximises safety
 * and makes no progress toward the objective. The search resolves that tension
 * rather than applying a rule.
 *
 * No Pk is invented here. Every emitter carries a pk supplied by the data layer
 * with its provenance, and routes report the weakest provenance they relied on.
 */

export type ThreatConfidence = 'accredited' | 'osint' | 'estimated'

export interface ThreatEmitter {
  id: string
  label: string
  lon: number
  lat: number
  /** Beyond this the emitter cannot detect at all, metres. */
  detectionRangeM: number
  /** Beyond this it can see but not engage, metres. */
  engagementRangeM: number
  /** Single-engagement probability of kill, 0-1, from the data layer. */
  pk: number
  /** Pulse-Doppler / MTI radars reject near-tangential targets. */
  dopplerNotch: boolean
  /**
   * Half-width of the clutter notch, in degrees of aspect either side of 90.
   * Wider notch = easier to hide tangentially.
   */
  notchHalfWidthDeg: number
  /** Engagement opportunities per minute once inside engagement range. */
  engagementsPerMin: number
  confidence: ThreatConfidence
}

export interface RoutePoint {
  lon: number
  lat: number
}

export interface RouteOptions {
  /** Platform ground speed, m/s. */
  speedMps: number
  /** Grid resolution for the search, metres. */
  gridStepM: number
  /**
   * Refuse routes longer than this multiple of the direct distance.
   * Keeps "safe" from meaning "fly around the theatre".
   */
  maxDetourFactor: number
  /** Terrain test: return true when the point is masked from that emitter. */
  isMaskedFrom?: (emitterId: string, point: RoutePoint) => boolean
}

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = {
  speedMps: 60,
  gridStepM: 2000,
  maxDetourFactor: 1.6,
}

const R_EARTH_M = 6371000
const DEG = Math.PI / 180

/** Hazard is integrated along a leg at roughly this spacing. */
const LEG_SAMPLE_SPACING_M = 2000
const MIN_LEG_SAMPLES = 8

/**
 * Inside this range the line of sight is numerically degenerate and aspect is
 * meaningless — you are on top of the emitter, so the notch cannot save you.
 */
const DEGENERATE_RANGE_M = 500

export function haversineM(a: RoutePoint, b: RoutePoint): number {
  const dLat = (b.lat - a.lat) * DEG
  const dLon = (b.lon - a.lon) * DEG
  const la1 = a.lat * DEG
  const la2 = b.lat * DEG
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial bearing from a to b, degrees. */
export function bearingDeg(a: RoutePoint, b: RoutePoint): number {
  const la1 = a.lat * DEG
  const la2 = b.lat * DEG
  const dLon = (b.lon - a.lon) * DEG
  const y = Math.sin(dLon) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon)
  return (Math.atan2(y, x) / DEG + 360) % 360
}

/**
 * Doppler visibility factor, 0-1.
 *
 * 1 when the target is closing or opening directly (full radial velocity), and
 * falling to near zero when the aspect approaches 90 degrees and the return sits
 * in the clutter notch. Modelled as |cos(aspect)| shaped by the notch width, not
 * a hard cutoff, because real notches have skirts.
 */
export function dopplerFactor(
  aspectDeg: number,
  notchHalfWidthDeg: number,
): number {
  // Fold the aspect into 0-90 as angular distance from broadside. 0 means the
  // track is perpendicular to the line of sight — zero radial velocity, deepest
  // in the notch. 90 means head-on or tail-on, full radial velocity.
  const offNotchDeg = Math.abs(((aspectDeg % 180) + 180) % 180 - 90)
  if (notchHalfWidthDeg <= 0) return 1
  const t = Math.min(1, offNotchDeg / notchHalfWidthDeg)
  // Smoothstep gives a skirt rather than a cliff edge.
  return t * t * (3 - 2 * t)
}

/**
 * Detection factor with range, 0-1.
 *
 * Radar return falls as 1/R^4, so detection confidence degrades sharply toward
 * the edge of the envelope. Normalised so it is 1 at the emitter and 0 at the
 * stated detection range.
 */
export function rangeFactor(rangeM: number, detectionRangeM: number): number {
  if (detectionRangeM <= 0 || rangeM >= detectionRangeM) return 0
  const x = 1 - rangeM / detectionRangeM
  return Math.max(0, Math.min(1, Math.pow(x, 0.25)))
}

/**
 * Hazard rate at a point on a given heading, in expected kills per second.
 *
 * Zero outside detection range, in the notch, or where terrain masks.
 */
export function hazardRate(
  point: RoutePoint,
  headingDeg: number,
  threats: readonly ThreatEmitter[],
  isMaskedFrom?: RouteOptions['isMaskedFrom'],
): number {
  let total = 0
  for (const t of threats) {
    const r = haversineM(point, { lon: t.lon, lat: t.lat })
    if (r >= t.detectionRangeM) continue
    if (isMaskedFrom?.(t.id, point)) continue

    const losDeg = bearingDeg(point, { lon: t.lon, lat: t.lat })
    const aspect = headingDeg - losDeg
    const doppler =
      t.dopplerNotch && r > DEGENERATE_RANGE_M ? dopplerFactor(aspect, t.notchHalfWidthDeg) : 1
    const pDetect = rangeFactor(r, t.detectionRangeM) * doppler
    if (pDetect <= 0) continue

    // Only inside engagement range does detection become lethal.
    const canEngage = r < t.engagementRangeM ? 1 : 0
    const perSec = (t.engagementsPerMin / 60) * t.pk
    total += pDetect * canEngage * perSec
  }
  return total
}

export interface RouteLeg {
  from: RoutePoint
  to: RoutePoint
  lengthM: number
  headingDeg: number
  hazard: number
}

export interface RouteResult {
  waypoints: RoutePoint[]
  legs: RouteLeg[]
  lengthM: number
  directLengthM: number
  detourFactor: number
  /** Accumulated hazard-time — the quantity minimised. */
  cumulativeHazard: number
  /** exp(-cumulativeHazard), 0-1. */
  survivalProbability: number
  /**
   * Weakest provenance among threats that actually contributed hazard.
   * Null when the route avoided every threat — no Pk was consulted, so
   * claiming a provenance would overstate what the figure rests on.
   */
  confidence: ThreatConfidence | null
  /** Threat ids the route could not avoid. */
  penetratedThreatIds: string[]
}

const CONF_RANK: Record<ThreatConfidence, number> = { accredited: 0, osint: 1, estimated: 2 }

/** Score an explicit list of waypoints — used for the direct leg and for results. */
export function scoreRoute(
  waypoints: readonly RoutePoint[],
  threats: readonly ThreatEmitter[],
  options: RouteOptions,
): RouteResult {
  const legs: RouteLeg[] = []
  let cumulativeHazard = 0
  const contributing = new Set<string>()

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]
    const lengthM = haversineM(from, to)
    const headingDeg = bearingDeg(from, to)
    const dt = options.speedMps > 0 ? lengthM / options.speedMps : 0

    // Integrate along the leg rather than sampling its midpoint. A single
    // sample misses everything a long leg passes through, and lands exactly on
    // the emitter when a leg crosses one — where the line of sight is
    // degenerate and the notch would read as zero hazard.
    const samples = Math.max(MIN_LEG_SAMPLES, Math.ceil(lengthM / LEG_SAMPLE_SPACING_M))
    let rateSum = 0
    for (let k = 0; k < samples; k++) {
      const f = (k + 0.5) / samples
      const at = {
        lon: from.lon + (to.lon - from.lon) * f,
        lat: from.lat + (to.lat - from.lat) * f,
      }
      rateSum += hazardRate(at, headingDeg, threats, options.isMaskedFrom)
      for (const t of threats) {
        const r = haversineM(at, { lon: t.lon, lat: t.lat })
        if (r < t.engagementRangeM && !options.isMaskedFrom?.(t.id, at)) contributing.add(t.id)
      }
    }
    const rate = rateSum / samples
    const hazard = rate * dt
    cumulativeHazard += hazard
    legs.push({ from, to, lengthM, headingDeg, hazard })
  }

  const lengthM = legs.reduce((a, l) => a + l.lengthM, 0)
  const directLengthM =
    waypoints.length > 1 ? haversineM(waypoints[0], waypoints[waypoints.length - 1]) : 0

  let confidence: ThreatConfidence | null = null
  for (const t of threats) {
    if (!contributing.has(t.id)) continue
    if (confidence === null || CONF_RANK[t.confidence] > CONF_RANK[confidence]) {
      confidence = t.confidence
    }
  }

  return {
    waypoints: [...waypoints],
    legs,
    lengthM,
    directLengthM,
    detourFactor: directLengthM > 0 ? lengthM / directLengthM : 1,
    cumulativeHazard,
    survivalProbability: Math.exp(-cumulativeHazard),
    confidence,
    penetratedThreatIds: [...contributing].sort(),
  }
}

// ── Search ──────────────────────────────────────────────────────────────────

/** Minimal binary heap — avoids a dependency for the open set. */
class MinHeap<T> {
  private a: { k: number; v: T }[] = []
  get size() { return this.a.length }
  push(k: number, v: T) {
    this.a.push({ k, v })
    let i = this.a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.a[p].k <= this.a[i].k) break
      ;[this.a[p], this.a[i]] = [this.a[i], this.a[p]]
      i = p
    }
  }
  pop(): T | undefined {
    if (this.a.length === 0) return undefined
    const top = this.a[0]
    const last = this.a.pop()!
    if (this.a.length > 0) {
      this.a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.a.length && this.a[l].k < this.a[m].k) m = l
        if (r < this.a.length && this.a[r].k < this.a[m].k) m = r
        if (m === i) break
        ;[this.a[m], this.a[i]] = [this.a[i], this.a[m]]
        i = m
      }
    }
    return top.v
  }
}

/**
 * Plan a minimum-hazard route from start to objective.
 *
 * Dijkstra over a lat/lon grid. Edge cost is accumulated hazard-time plus a
 * small length term: hazard dominates, and length only breaks ties between
 * equally safe paths so the result does not wander. Nodes outside the detour
 * allowance are never expanded, which both bounds the search and enforces the
 * "longer, but not much longer" requirement.
 *
 * Returns the direct route unchanged when it is already the safest option —
 * a planner that always bends is as useless as one that never does.
 */
export function planThreatRoute(
  start: RoutePoint,
  objective: RoutePoint,
  threats: readonly ThreatEmitter[],
  options: Partial<RouteOptions> = {},
): RouteResult {
  const o: RouteOptions = { ...DEFAULT_ROUTE_OPTIONS, ...options }
  const direct = scoreRoute([start, objective], threats, o)
  if (threats.length === 0 || direct.cumulativeHazard === 0) return direct

  const directM = haversineM(start, objective)
  const budgetM = directM * o.maxDetourFactor

  // Grid spacing in degrees at this latitude.
  const midLat = (start.lat + objective.lat) / 2
  const dLat = (o.gridStepM / R_EARTH_M) / DEG
  const dLon = dLat / Math.max(0.15, Math.cos(midLat * DEG))

  // Lateral room to manoeuvre, derived from the detour budget.
  const marginM = Math.max(o.gridStepM * 2, (budgetM - directM) / 2)
  const marginLat = (marginM / R_EARTH_M) / DEG
  const marginLon = marginLat / Math.max(0.15, Math.cos(midLat * DEG))

  const minLat = Math.min(start.lat, objective.lat) - marginLat
  const maxLat = Math.max(start.lat, objective.lat) + marginLat
  const minLon = Math.min(start.lon, objective.lon) - marginLon
  const maxLon = Math.max(start.lon, objective.lon) + marginLon

  const rows = Math.max(2, Math.ceil((maxLat - minLat) / dLat) + 1)
  const cols = Math.max(2, Math.ceil((maxLon - minLon) / dLon) + 1)

  // A very large grid means the caller asked for a step too fine for the span.
  if (rows * cols > 40_000) return direct

  const toPoint = (r: number, c: number): RoutePoint => ({
    lat: minLat + r * dLat,
    lon: minLon + c * dLon,
  })
  const nearest = (p: RoutePoint) => ({
    r: Math.max(0, Math.min(rows - 1, Math.round((p.lat - minLat) / dLat))),
    c: Math.max(0, Math.min(cols - 1, Math.round((p.lon - minLon) / dLon))),
  })

  const s = nearest(start)
  const g = nearest(objective)
  const idx = (r: number, c: number) => r * cols + c

  const dist = new Float64Array(rows * cols).fill(Infinity)
  const prev = new Int32Array(rows * cols).fill(-1)
  const done = new Uint8Array(rows * cols)
  const travelled = new Float64Array(rows * cols).fill(Infinity)

  dist[idx(s.r, s.c)] = 0
  travelled[idx(s.r, s.c)] = 0
  const open = new MinHeap<number>()
  open.push(0, idx(s.r, s.c))

  const NEIGHBOURS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ]
  // Tie-break weight: small enough that it never outranks real hazard.
  const LENGTH_WEIGHT = 1e-9

  while (open.size > 0) {
    const cur = open.pop()!
    if (done[cur]) continue
    done[cur] = 1
    if (cur === idx(g.r, g.c)) break

    const r = Math.floor(cur / cols)
    const c = cur - r * cols
    const from = toPoint(r, c)

    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      const ni = idx(nr, nc)
      if (done[ni]) continue

      const to = toPoint(nr, nc)
      const segM = haversineM(from, to)
      const newTravelled = travelled[cur] + segM
      // Enforce the detour budget during search, not after.
      if (newTravelled + haversineM(to, objective) > budgetM) continue

      const heading = bearingDeg(from, to)
      const mid = { lon: (from.lon + to.lon) / 2, lat: (from.lat + to.lat) / 2 }
      const rate = hazardRate(mid, heading, threats, o.isMaskedFrom)
      const dt = o.speedMps > 0 ? segM / o.speedMps : 0
      const cost = rate * dt + segM * LENGTH_WEIGHT

      const nd = dist[cur] + cost
      if (nd < dist[ni]) {
        dist[ni] = nd
        prev[ni] = cur
        travelled[ni] = newTravelled
        open.push(nd, ni)
      }
    }
  }

  const goal = idx(g.r, g.c)
  if (!Number.isFinite(dist[goal])) return direct

  // Walk the chain back, then simplify collinear runs into waypoints.
  const chain: number[] = []
  for (let n = goal; n !== -1; n = prev[n]) chain.push(n)
  chain.reverse()

  const raw: RoutePoint[] = chain.map((n) => toPoint(Math.floor(n / cols), n - Math.floor(n / cols) * cols))
  raw[0] = start
  raw[raw.length - 1] = objective

  const waypoints: RoutePoint[] = [raw[0]]
  for (let i = 1; i < raw.length - 1; i++) {
    const inBearing = bearingDeg(raw[i - 1], raw[i])
    const outBearing = bearingDeg(raw[i], raw[i + 1])
    const turn = Math.abs(((outBearing - inBearing + 540) % 360) - 180)
    // Keep only real turns — a waypoint every grid cell is not a flight plan.
    if (turn > 5) waypoints.push(raw[i])
  }
  waypoints.push(raw[raw.length - 1])

  const planned = scoreRoute(waypoints, threats, o)
  // If bending bought nothing, say so by returning the direct leg.
  return planned.cumulativeHazard < direct.cumulativeHazard ? planned : direct
}
