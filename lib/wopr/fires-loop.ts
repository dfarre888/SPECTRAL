/**
 * Drone-to-shooter loop ("Uber for fires").
 *
 * Australian Army describes Ukraine's targeting as almost Uber for fires: a
 * target goes into the system, a battle captain approves it, and it routes to
 * whichever drone or artillery asset is free (Defence Connect, 24 Sep 2026).
 * This is a small discrete-event model of that loop so the two ways of
 * running it can be compared on the same targets:
 *
 *   appear -> detect (recon drone) -> nominate -> approve (battle captain)
 *          -> assign to a free shooter -> time to effect -> BDA
 *
 * A target that is not destroyed before its dwell time ends moves or escapes.
 * Every number is a planning assumption the user can change; two are taken
 * from the source above (drones staged per operator, FPV reach with a relay).
 *
 * Pure and seeded: the same inputs and seed always give the same answer, and
 * both presets see the same targets (common random numbers), so a difference
 * between them is the C2 process, not luck.
 */

// ── Parameters ──────────────────────────────────────────────────────────────

export type ShooterKind = 'fpv' | 'loiter' | 'artillery'
export type AssignRule = 'call_order' | 'fastest'

export interface ShooterClassParams {
  /** Independent shooters of this kind (teams, launchers, fire units). */
  count: number
  /** Drones or rounds each shooter holds for the window. */
  munitionsEach: number
  /** Tasking received to launch or fire (min). */
  prepMin: number
  /** Flight speed (km/h). 0 means use `flightMin` instead. */
  speedKmh: number
  /** Fixed time of flight (min), used when speed is 0 (artillery). */
  flightMin: number
  /** Maximum reach (km). */
  rangeKm: number
  /** After effect, time before this shooter can take the next task (min). */
  turnaroundMin: number
  /** Chance one engagement destroys the target (0 to 1). */
  pk: number
}

export interface SharedParams {
  /** Length of the period targets can appear in (min). */
  windowMin: number
  /** Mean rate targets appear (per hour, Poisson). */
  arrivalsPerHour: number
  /** A target stays engageable for a uniform time in [min, max] before it moves or escapes. */
  dwellMinMin: number
  dwellMaxMin: number
  /** Targets appear this far beyond the shooters' line (km, uniform). */
  depthMinKm: number
  depthMaxKm: number
  /** Width of the sector (km). Shooters are spaced evenly across it. */
  frontageKm: number
  /** Mean time for the recon drone to find a target after it appears (min, exponential). */
  detectMeanMin: number
  /** Battle damage assessment after an effect (min). A miss goes back for re-attack after BDA. */
  bdaMin: number
  fpv: ShooterClassParams
  loiter: ShooterClassParams
  artillery: ShooterClassParams
}

export interface C2Params {
  /** Recon team builds and sends the target nomination (min). */
  nominateMin: number
  /** Battle captain's time to approve one target (min). */
  approveMin: number
  /** Approvals that can run at once. 1 is a single serial queue. */
  approvalLanes: number
  /** Time to find and task a shooter once approved (min). */
  assignMin: number
  /** Assignment is done over the same net as approval, so it occupies an approval lane. */
  assignUsesApprovalNet: boolean
  /** call_order: first free shooter in a fixed calling order. fastest: free shooter with the shortest time to effect. */
  assignRule: AssignRule
}

export interface FiresLoopPreset {
  id: 'voice' | 'digital'
  label: string
  summary: string
  c2: C2Params
}

/** A parameter whose default comes from a published source rather than a planning estimate. */
export const SOURCED_PARAMS: Record<string, string> = {
  'fpv.munitionsEach':
    'One operator can stage 6 drones (Defence Connect, 24 Sep 2026, Land Combat College RAS Cell).',
  'fpv.rangeKm':
    'Explosive FPV reach about 20 km with repeater drones (Defence Connect, 24 Sep 2026).',
}

export const DEFAULT_SHARED: SharedParams = {
  windowMin: 120,
  arrivalsPerHour: 10,
  dwellMinMin: 10,
  dwellMaxMin: 30,
  depthMinKm: 2,
  depthMaxKm: 10,
  frontageKm: 10,
  detectMeanMin: 3,
  bdaMin: 2,
  fpv: {
    count: 3,
    munitionsEach: 6,
    prepMin: 2,
    speedKmh: 100,
    flightMin: 0,
    rangeKm: 20,
    turnaroundMin: 4,
    pk: 0.5,
  },
  loiter: {
    count: 1,
    munitionsEach: 4,
    prepMin: 5,
    speedKmh: 110,
    flightMin: 0,
    rangeKm: 40,
    turnaroundMin: 3,
    pk: 0.6,
  },
  artillery: {
    count: 1,
    munitionsEach: 30,
    prepMin: 3,
    speedKmh: 0,
    flightMin: 1.5,
    rangeKm: 30,
    turnaroundMin: 2,
    pk: 0.35,
  },
}

export const VOICE_NET: FiresLoopPreset = {
  id: 'voice',
  label: 'Voice net',
  summary: 'One battle captain approves targets in turn and tasks shooters by radio, working down a calling order.',
  c2: {
    nominateMin: 4,
    approveMin: 2,
    approvalLanes: 1,
    assignMin: 2,
    assignUsesApprovalNet: true,
    assignRule: 'call_order',
  },
}

export const DIGITAL_TASKING: FiresLoopPreset = {
  id: 'digital',
  label: 'Digital tasking',
  summary: 'Nominations arrive as data, approvals run in parallel, and the system tasks the nearest free shooter.',
  c2: {
    nominateMin: 1,
    approveMin: 1.5,
    approvalLanes: 3,
    assignMin: 0.5,
    assignUsesApprovalNet: false,
    assignRule: 'fastest',
  },
}

export const FIRES_LOOP_PRESETS: readonly FiresLoopPreset[] = [VOICE_NET, DIGITAL_TASKING]

// ── Randomness ──────────────────────────────────────────────────────────────

/** mulberry32: small, fast, seedable PRNG returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A uniform draw keyed by (seed, a, b): the same key always gives the same number. */
function keyedUniform(seed: number, a: number, b: number): number {
  const mixed = (seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca77)) >>> 0
  return mulberry32(mixed)()
}

function exponential(rand: () => number, mean: number): number {
  if (mean <= 0) return 0
  return -Math.log(1 - rand()) * mean
}

// ── Statistics ──────────────────────────────────────────────────────────────

/** Linear-interpolated percentile (p in 0..100). Null for no data. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo)
}

// ── Model ───────────────────────────────────────────────────────────────────

export type TargetOutcome =
  | 'destroyed'
  | 'escaped_undetected'
  | 'escaped_awaiting_approval'
  | 'escaped_awaiting_shooter'
  | 'escaped_under_attack'

export const OUTCOME_LABEL: Record<TargetOutcome, string> = {
  destroyed: 'Destroyed',
  escaped_undetected: 'Escaped before detection',
  escaped_awaiting_approval: 'Escaped awaiting approval',
  escaped_awaiting_shooter: 'Escaped awaiting a shooter',
  escaped_under_attack: 'Escaped under attack',
}

type Stage = 'undetected' | 'nominating' | 'awaiting_approval' | 'approving' | 'awaiting_shooter' | 'assigning' | 'in_flight' | 'bda' | 'done'

export interface TargetRecord {
  id: number
  appearAt: number
  escapeAt: number
  x: number
  depth: number
  detectAt: number | null
  nominatedAt: number | null
  approvalStartAt: number | null
  approvedAt: number | null
  firstEffectAt: number | null
  destroyedAt: number | null
  attempts: number
  shooters: string[]
  outcome: TargetOutcome
  /** Detection to first munition arriving (min). */
  sensorToEffectMin: number | null
}

export interface ShooterRecord {
  id: string
  kind: ShooterKind
  x: number
  launches: number
  /** Busy minutes inside the window (reserved for a task, flying, or turning around). */
  busyMin: number
}

export interface RunResult {
  targets: TargetRecord[]
  shooters: ShooterRecord[]
  approvalQueuePeak: number
  /** Time-weighted mean length of the approval queue over the window. */
  approvalQueueMean: number
  /** Mean wait from nomination to the start of approval (min), over targets that reached approval. */
  approvalWaitMeanMin: number | null
}

interface MutableTarget extends Omit<TargetRecord, 'outcome'> {
  stage: Stage
  outcome: TargetOutcome | null
  bdaAt: number | null
}

interface MutableShooter extends ShooterRecord {
  params: ShooterClassParams
  munitions: number
  busy: boolean
  reservedAt: number
}

type SimEvent =
  | { t: number; seq: number; kind: 'detect'; target: number }
  | { t: number; seq: number; kind: 'nominated'; target: number }
  | { t: number; seq: number; kind: 'approved'; target: number }
  | { t: number; seq: number; kind: 'assigned'; target: number; shooter: number; lane: boolean }
  | { t: number; seq: number; kind: 'effect'; target: number; shooter: number }
  | { t: number; seq: number; kind: 'bda'; target: number }
  | { t: number; seq: number; kind: 'escape'; target: number }
  | { t: number; seq: number; kind: 'free'; shooter: number }

type NewEvent = SimEvent extends infer E ? (E extends SimEvent ? Omit<E, 'seq'> : never) : never

/** Binary min-heap on (t, seq) so ties resolve in the order they were scheduled. */
class EventQueue {
  private heap: SimEvent[] = []
  private seq = 0
  push(e: NewEvent): void {
    const ev = { ...e, seq: this.seq++ } as SimEvent
    const h = this.heap
    h.push(ev)
    let i = h.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (less(h[p], h[i])) break
      ;[h[p], h[i]] = [h[i], h[p]]
      i = p
    }
  }
  pop(): SimEvent | undefined {
    const h = this.heap
    if (h.length === 0) return undefined
    const top = h[0]
    const last = h.pop()!
    if (h.length > 0) {
      h[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < h.length && less(h[l], h[m])) m = l
        if (r < h.length && less(h[r], h[m])) m = r
        if (m === i) break
        ;[h[m], h[i]] = [h[i], h[m]]
        i = m
      }
    }
    return top
  }
}

function less(a: SimEvent, b: SimEvent): boolean {
  return a.t < b.t || (a.t === b.t && a.seq < b.seq)
}

const KIND_ORDER: ShooterKind[] = ['fpv', 'loiter', 'artillery']
const KIND_LABEL: Record<ShooterKind, string> = { fpv: 'FPV team', loiter: 'LM launcher', artillery: 'Fire unit' }

function buildShooters(shared: SharedParams): MutableShooter[] {
  const list: Array<{ kind: ShooterKind; params: ShooterClassParams; n: number }> = KIND_ORDER.map((kind) => ({
    kind,
    params: shared[kind],
    n: Math.max(0, Math.floor(shared[kind].count)),
  }))
  const total = list.reduce((s, c) => s + c.n, 0)
  const out: MutableShooter[] = []
  let i = 0
  for (const c of list) {
    for (let k = 0; k < c.n; k++) {
      const x = total > 0 ? -shared.frontageKm / 2 + ((i + 0.5) * shared.frontageKm) / total : 0
      out.push({
        id: `${KIND_LABEL[c.kind]} ${String.fromCharCode(65 + k)}`,
        kind: c.kind,
        x,
        launches: 0,
        busyMin: 0,
        params: c.params,
        munitions: Math.max(0, Math.floor(c.params.munitionsEach)),
        busy: false,
        reservedAt: 0,
      })
      i++
    }
  }
  return out
}

function generateTargets(shared: SharedParams, seed: number): MutableTarget[] {
  const rand = mulberry32(seed)
  const targets: MutableTarget[] = []
  const ratePerMin = Math.max(0, shared.arrivalsPerHour) / 60
  if (ratePerMin <= 0 || shared.windowMin <= 0) return targets
  let t = 0
  for (let id = 0; id < 10_000; id++) {
    t += exponential(rand, 1 / ratePerMin)
    // Draw every attribute even past the window so the stream stays aligned.
    const dwellLo = Math.max(0, Math.min(shared.dwellMinMin, shared.dwellMaxMin))
    const dwellHi = Math.max(shared.dwellMinMin, shared.dwellMaxMin)
    const dwell = dwellLo + rand() * (dwellHi - dwellLo)
    const x = (rand() - 0.5) * shared.frontageKm
    const dLo = Math.min(shared.depthMinKm, shared.depthMaxKm)
    const dHi = Math.max(shared.depthMinKm, shared.depthMaxKm)
    const depth = dLo + rand() * (dHi - dLo)
    const detectDelay = exponential(rand, shared.detectMeanMin)
    if (t > shared.windowMin) break
    targets.push({
      id,
      appearAt: t,
      escapeAt: t + dwell,
      x,
      depth,
      detectAt: detectDelay < dwell ? t + detectDelay : null,
      nominatedAt: null,
      approvalStartAt: null,
      approvedAt: null,
      firstEffectAt: null,
      destroyedAt: null,
      bdaAt: null,
      attempts: 0,
      shooters: [],
      stage: 'undetected',
      outcome: null,
      sensorToEffectMin: null,
    })
  }
  return targets
}

function distanceKm(s: MutableShooter, t: MutableTarget): number {
  return Math.hypot(t.x - s.x, t.depth)
}

/** Tasking to munition arriving (min) for this shooter against this target. */
function timeToEffect(s: MutableShooter, t: MutableTarget): number {
  const p = s.params
  const flight = p.speedKmh > 0 ? (distanceKm(s, t) / p.speedKmh) * 60 : Math.max(0, p.flightMin)
  return Math.max(0, p.prepMin) + flight
}

/** Run one replication. */
export function runFiresLoop(shared: SharedParams, c2: C2Params, seed: number): RunResult {
  const targets = generateTargets(shared, seed)
  const shooters = buildShooters(shared)
  const q = new EventQueue()

  const approveQueue: number[] = []
  const assignQueue: number[] = []
  let lanesFree = Math.max(1, Math.floor(c2.approvalLanes))

  let queuePeak = 0
  let queueArea = 0
  let lastT = 0
  const window = Math.max(0, shared.windowMin)
  const waits: number[] = []

  const accrueQueue = (now: number) => {
    const from = Math.min(lastT, window)
    const to = Math.min(now, window)
    if (to > from) queueArea += approveQueue.length * (to - from)
    lastT = now
  }

  const canTake = (s: MutableShooter, t: MutableTarget) =>
    !s.busy && s.munitions > 0 && distanceKm(s, t) <= s.params.rangeKm

  const pickShooter = (t: MutableTarget): number => {
    let best = -1
    let bestTime = Infinity
    for (let i = 0; i < shooters.length; i++) {
      const s = shooters[i]
      if (!canTake(s, t)) continue
      if (c2.assignRule === 'call_order') return i
      const tte = timeToEffect(s, t)
      if (tte < bestTime) {
        bestTime = tte
        best = i
      }
    }
    return best
  }

  const reserve = (i: number, now: number) => {
    shooters[i].busy = true
    shooters[i].reservedAt = now
  }

  const release = (i: number, now: number) => {
    const s = shooters[i]
    const from = Math.min(s.reservedAt, window)
    const to = Math.min(now, window)
    if (to > from) s.busyMin += to - from
    s.busy = false
  }

  /** First target in the assignment queue that some shooter can take, with that shooter. */
  const nextAssignable = (): { qi: number; shooter: number } | null => {
    for (let qi = 0; qi < assignQueue.length; qi++) {
      const shooter = pickShooter(targets[assignQueue[qi]])
      if (shooter >= 0) return { qi, shooter }
    }
    return null
  }

  const startAssignment = (now: number, qi: number, shooter: number, lane: boolean) => {
    const ti = assignQueue.splice(qi, 1)[0]
    targets[ti].stage = 'assigning'
    reserve(shooter, now)
    q.push({ t: now + Math.max(0, c2.assignMin), kind: 'assigned', target: ti, shooter, lane })
  }

  const dispatch = (now: number) => {
    for (;;) {
      let progressed = false
      if (lanesFree > 0) {
        const next = c2.assignUsesApprovalNet ? nextAssignable() : null
        if (next) {
          // Finish tasking what is already approved before taking new approvals.
          lanesFree--
          startAssignment(now, next.qi, next.shooter, true)
          progressed = true
        } else if (approveQueue.length > 0) {
          accrueQueue(now)
          const ti = approveQueue.shift()!
          const t = targets[ti]
          t.stage = 'approving'
          t.approvalStartAt = now
          if (t.nominatedAt !== null) waits.push(now - t.nominatedAt)
          lanesFree--
          q.push({ t: now + Math.max(0, c2.approveMin), kind: 'approved', target: ti })
          progressed = true
        }
      }
      if (!c2.assignUsesApprovalNet) {
        const next = nextAssignable()
        if (next) {
          startAssignment(now, next.qi, next.shooter, false)
          progressed = true
        }
      }
      if (!progressed) break
    }
  }

  const finish = (t: MutableTarget, outcome: TargetOutcome) => {
    t.stage = 'done'
    t.outcome = outcome
  }

  for (const t of targets) {
    if (t.detectAt !== null) q.push({ t: t.detectAt, kind: 'detect', target: t.id })
    q.push({ t: t.escapeAt, kind: 'escape', target: t.id })
  }

  for (let ev = q.pop(); ev; ev = q.pop()) {
    const now = ev.t
    accrueQueue(now)
    switch (ev.kind) {
      case 'detect': {
        const t = targets[ev.target]
        if (t.stage !== 'undetected') break
        t.stage = 'nominating'
        q.push({ t: now + Math.max(0, c2.nominateMin), kind: 'nominated', target: t.id })
        break
      }
      case 'nominated': {
        const t = targets[ev.target]
        if (t.stage !== 'nominating') break
        t.nominatedAt = now
        t.stage = 'awaiting_approval'
        approveQueue.push(t.id)
        queuePeak = Math.max(queuePeak, approveQueue.length)
        dispatch(now)
        break
      }
      case 'approved': {
        lanesFree++
        const t = targets[ev.target]
        if (t.stage === 'approving') {
          t.approvedAt = now
          t.stage = 'awaiting_shooter'
          assignQueue.push(t.id)
        }
        dispatch(now)
        break
      }
      case 'assigned': {
        if (ev.lane) lanesFree++
        const t = targets[ev.target]
        const s = shooters[ev.shooter]
        if (t.stage !== 'assigning') {
          // The target left while the shooter was being tasked; nothing launched.
          release(ev.shooter, now)
          dispatch(now)
          break
        }
        s.munitions--
        s.launches++
        t.attempts++
        t.shooters.push(s.id)
        t.stage = 'in_flight'
        q.push({ t: now + timeToEffect(s, t), kind: 'effect', target: t.id, shooter: ev.shooter })
        dispatch(now)
        break
      }
      case 'effect': {
        const t = targets[ev.target]
        const s = shooters[ev.shooter]
        q.push({ t: now + Math.max(0, s.params.turnaroundMin), kind: 'free', shooter: ev.shooter })
        if (t.stage !== 'in_flight') break // it escaped before the munition arrived
        if (t.firstEffectAt === null) {
          t.firstEffectAt = now
          if (t.detectAt !== null) t.sensorToEffectMin = now - t.detectAt
        }
        const hit = keyedUniform(seed, t.id, t.attempts) < Math.min(1, Math.max(0, s.params.pk))
        if (hit) {
          t.destroyedAt = now
          t.bdaAt = now + Math.max(0, shared.bdaMin)
          finish(t, 'destroyed')
        } else {
          t.stage = 'bda'
          q.push({ t: now + Math.max(0, shared.bdaMin), kind: 'bda', target: t.id })
        }
        break
      }
      case 'bda': {
        const t = targets[ev.target]
        if (t.stage !== 'bda') break
        // Already approved: a missed target goes straight back for re-attack.
        t.stage = 'awaiting_shooter'
        assignQueue.push(t.id)
        dispatch(now)
        break
      }
      case 'free': {
        release(ev.shooter, now)
        dispatch(now)
        break
      }
      case 'escape': {
        const t = targets[ev.target]
        if (t.stage === 'done') break
        const stage = t.stage
        const ai = approveQueue.indexOf(t.id)
        if (ai >= 0) approveQueue.splice(ai, 1)
        const si = assignQueue.indexOf(t.id)
        if (si >= 0) assignQueue.splice(si, 1)
        finish(
          t,
          stage === 'undetected'
            ? 'escaped_undetected'
            : stage === 'nominating' || stage === 'awaiting_approval' || stage === 'approving'
              ? 'escaped_awaiting_approval'
              : stage === 'awaiting_shooter' || stage === 'assigning'
                ? 'escaped_awaiting_shooter'
                : 'escaped_under_attack',
        )
        break
      }
    }
  }
  accrueQueue(Math.max(lastT, window))

  // A shooter still reserved when the queue drains (cannot happen with a free
  // event per effect, but guard the accounting anyway).
  for (let i = 0; i < shooters.length; i++) if (shooters[i].busy) release(i, window)

  return {
    targets: targets.map((t) => ({
      id: t.id,
      appearAt: t.appearAt,
      escapeAt: t.escapeAt,
      x: t.x,
      depth: t.depth,
      detectAt: t.detectAt,
      nominatedAt: t.nominatedAt,
      approvalStartAt: t.approvalStartAt,
      approvedAt: t.approvedAt,
      firstEffectAt: t.firstEffectAt,
      destroyedAt: t.destroyedAt,
      attempts: t.attempts,
      shooters: t.shooters,
      outcome: t.outcome ?? 'escaped_under_attack',
      sensorToEffectMin: t.sensorToEffectMin,
    })),
    shooters: shooters.map(({ id, kind, x, launches, busyMin }) => ({ id, kind, x, launches, busyMin })),
    approvalQueuePeak: queuePeak,
    approvalQueueMean: window > 0 ? queueArea / window : 0,
    approvalWaitMeanMin: waits.length ? waits.reduce((s, w) => s + w, 0) / waits.length : null,
  }
}

// ── Replications ────────────────────────────────────────────────────────────

export interface FiresLoopSummary {
  runs: number
  sensorToEffect: {
    /** Pooled detection-to-first-effect times across every run (min). */
    samples: number[]
    median: number | null
    p90: number | null
  }
  /** Means per run. */
  appeared: number
  detected: number
  /** Targets that had at least one munition arrive. */
  engaged: number
  destroyed: number
  escaped: number
  outcomes: Record<TargetOutcome, number>
  approvalQueuePeak: number
  approvalQueueMean: number
  approvalWaitMeanMin: number | null
  /** Busy share of the window by shooter kind (0 to 1). NaN-free: 0 when a kind has no shooters. */
  utilisation: Record<ShooterKind, number>
  /** Drones or rounds used per run, by kind. */
  launches: Record<ShooterKind, number>
  /** The first run, kept whole for per-target tables. */
  sample: RunResult
}

export interface BatchOptions {
  seed: number
  runs: number
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

export function runFiresLoopBatch(shared: SharedParams, c2: C2Params, opts: BatchOptions): FiresLoopSummary {
  const runs = Math.max(1, Math.min(1000, Math.floor(opts.runs)))
  const samples: number[] = []
  const outcomeKeys = Object.keys(OUTCOME_LABEL) as TargetOutcome[]
  const perRun = {
    appeared: [] as number[],
    detected: [] as number[],
    engaged: [] as number[],
    destroyed: [] as number[],
    peak: [] as number[],
    qmean: [] as number[],
    waits: [] as number[],
    outcomes: Object.fromEntries(outcomeKeys.map((k) => [k, [] as number[]])) as Record<TargetOutcome, number[]>,
    util: { fpv: [] as number[], loiter: [] as number[], artillery: [] as number[] },
    launches: { fpv: [] as number[], loiter: [] as number[], artillery: [] as number[] },
  }
  let first: RunResult | null = null

  for (let r = 0; r < runs; r++) {
    const res = runFiresLoop(shared, c2, (opts.seed + r * 7919) >>> 0)
    if (!first) first = res
    for (const t of res.targets) if (t.sensorToEffectMin !== null) samples.push(t.sensorToEffectMin)
    perRun.appeared.push(res.targets.length)
    perRun.detected.push(res.targets.filter((t) => t.detectAt !== null).length)
    perRun.engaged.push(res.targets.filter((t) => t.firstEffectAt !== null).length)
    perRun.destroyed.push(res.targets.filter((t) => t.outcome === 'destroyed').length)
    for (const k of outcomeKeys) perRun.outcomes[k].push(res.targets.filter((t) => t.outcome === k).length)
    perRun.peak.push(res.approvalQueuePeak)
    perRun.qmean.push(res.approvalQueueMean)
    if (res.approvalWaitMeanMin !== null) perRun.waits.push(res.approvalWaitMeanMin)
    for (const kind of KIND_ORDER) {
      const of = res.shooters.filter((s) => s.kind === kind)
      const capacity = of.length * Math.max(0, shared.windowMin)
      perRun.util[kind].push(capacity > 0 ? of.reduce((s, x) => s + x.busyMin, 0) / capacity : 0)
      perRun.launches[kind].push(of.reduce((s, x) => s + x.launches, 0))
    }
  }

  const appeared = mean(perRun.appeared)
  const destroyed = mean(perRun.destroyed)
  return {
    runs,
    sensorToEffect: {
      samples,
      median: percentile(samples, 50),
      p90: percentile(samples, 90),
    },
    appeared,
    detected: mean(perRun.detected),
    engaged: mean(perRun.engaged),
    destroyed,
    escaped: appeared - destroyed,
    outcomes: Object.fromEntries(outcomeKeys.map((k) => [k, mean(perRun.outcomes[k])])) as Record<TargetOutcome, number>,
    approvalQueuePeak: mean(perRun.peak),
    approvalQueueMean: mean(perRun.qmean),
    approvalWaitMeanMin: perRun.waits.length ? mean(perRun.waits) : null,
    utilisation: {
      fpv: mean(perRun.util.fpv),
      loiter: mean(perRun.util.loiter),
      artillery: mean(perRun.util.artillery),
    },
    launches: {
      fpv: mean(perRun.launches.fpv),
      loiter: mean(perRun.launches.loiter),
      artillery: mean(perRun.launches.artillery),
    },
    sample: first!,
  }
}
