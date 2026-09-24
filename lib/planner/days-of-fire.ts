/**
 * Days of fire: how long a defended site lasts under repeated raids, and what
 * it costs.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * Deterministic expected-value model. No randomness, so the same inputs always
 * give the same answer, which is what a planning conversation needs.
 *
 * Each night a raid arrives. Threats meet the cheapest effective layer first
 * (the cost-exchange ranking on the economics page); a layer fires one
 * engagement per threat it can reach, and every survivor, plus every threat
 * the layer had no rounds or time for, passes to the next layer up the ladder.
 * Whatever survives the last layer is a leaker. Expensive interceptors are
 * therefore spent only on what the cheap layers let through, until the cheap
 * magazines run dry and the whole raid falls on the expensive ones.
 *
 * Everything is a band because the inputs are bands. Each run is done twice:
 * once with every layer at the low end of its Pk band and once at the high
 * end. Spend is then priced at both ends of the cost band. The low-Pk run is
 * the planning case; the high-Pk run shows the best the data allows.
 *
 * Numbers in, not numbers made up: cost per round comes from the cost table
 * (`cost-model.ts`), Pk from the Defeat Matrix and swarm table
 * (`days-of-fire-pk.ts`). Magazines, resupply, nightly limits and raid sizes
 * are the planner's own assumptions and must be presented as such.
 */

import {
  COST_ENTRIES,
  recommendedAgainst,
  type CostEntry,
  type CostInterval,
} from '@/lib/planner/cost-model'
import { pkBandsFor, type PkBand, type PkEvidence } from '@/lib/planner/days-of-fire-pk'

export interface Band {
  lo: number
  hi: number
}

export interface DofLayer {
  id: string
  label: string
  /** Cost per round, or per engagement for a reusable effect. */
  costPerRoundUsd: CostInterval
  /** Rounds fired per engagement (a gun burst). 1 for missiles and reusable effects. */
  roundsPerEngagement: number
  /** Probability of kill per engagement, 0 to 1. */
  pk: Band
  /** Reusable effects (RF, laser, HPM) have no magazine, only a nightly limit. */
  reusable: boolean
  /** Rounds on hand before night 1. Ignored for reusable effects. */
  magazine: number
  /** Rounds delivered before each night from night 2 on. Ignored for reusable effects. */
  resupplyPerDay: number
  /**
   * Most engagements the layer can make in one night: fire units, reload time,
   * dwell, power, weather. Infinity when only the magazine limits it.
   */
  maxPerNight: number
}

export interface DofInput {
  threatCostUsd: CostInterval
  /** Threats arriving each night; index 0 is night 1. */
  raids: readonly number[]
  layers: readonly DofLayer[]
}

export interface DofLayerNight {
  id: string
  /** Threats that got as far as this layer. */
  reached: number
  engaged: number
  kills: number
  roundsFired: number
  /** Rounds left after the night. Infinity for reusable effects. */
  roundsLeft: number
  /** Ran dry: threats reached this layer that it had no rounds for. */
  dry: boolean
  /** Fewer rounds left than one engagement at the end of the night. */
  empty: boolean
}

export interface DofNight {
  day: number
  raid: number
  layers: DofLayerNight[]
  leakers: number
  cumulativeThreats: number
  cumulativeLeakers: number
  /** Cumulative spend in this run, priced at the low and high cost. */
  cumulativeCostUsd: Band
}

export interface DofCase {
  pk: 'low' | 'high'
  nights: DofNight[]
  /**
   * First night each expendable layer ran dry, meaning threats reached it that
   * it had no rounds for; null if it never did. A magazine that is emptied and
   * refilled before the next raid has not run dry.
   */
  dryDay: Record<string, number | null>
  /** The first magazine to run dry. */
  firstDry: { day: number; layerId: string } | null
  /** First night every expendable magazine ended empty together. */
  allDryDay: number | null
  /** First day the cumulative expected leakers reach one whole threat. */
  firstLeakerDay: number | null
  totalLeakers: number
  roundsFired: Record<string, number>
  costUsd: Band
}

export interface DofDay {
  day: number
  raid: number
  cumulativeThreats: number
  /** Low end from the high-Pk run, high end from the low-Pk run. */
  leakers: Band
  cumulativeLeakers: Band
  cumulativeCostUsd: Band
  /** Cumulative defence spend over cumulative attacker spend. */
  exchange: Band
}

export interface DofResult {
  /** The ladder actually used, cheapest engagement first. */
  layers: DofLayer[]
  excluded: { id: string; label: string; reason: string }[]
  low: DofCase
  high: DofCase
  days: DofDay[]
  totals: {
    threats: number
    leakers: Band
    costUsd: Band
    attackerCostUsd: Band
    exchange: Band
  }
}

export const DOF_MAX_DAYS = 90
/** Cumulative expected leakers at which the first threat is counted through. */
export const FIRST_LEAKER_THRESHOLD = 1
const EPS = 1e-9

function finiteNonNeg(n: number, fallback = 0): number {
  return Number.isFinite(n) && n > 0 ? n : n === Infinity ? Infinity : fallback
}

function sanitise(layer: DofLayer): DofLayer {
  return {
    ...layer,
    roundsPerEngagement: layer.reusable ? 1 : Math.max(1, finiteNonNeg(layer.roundsPerEngagement, 1)),
    pk: {
      lo: Math.min(1, Math.max(0, layer.pk.lo)),
      hi: Math.min(1, Math.max(0, layer.pk.hi)),
    },
    magazine: finiteNonNeg(layer.magazine),
    resupplyPerDay: finiteNonNeg(layer.resupplyPerDay),
    maxPerNight: Number.isNaN(layer.maxPerNight) ? Infinity : Math.max(0, layer.maxPerNight),
  }
}

export function engagementCostUsd(layer: DofLayer): CostInterval {
  return {
    loUsd: layer.costPerRoundUsd.loUsd * layer.roundsPerEngagement,
    hiUsd: layer.costPerRoundUsd.hiUsd * layer.roundsPerEngagement,
  }
}

/** Cheapest engagement first; ties keep the caller's order. */
export function ladderOrder(layers: readonly DofLayer[]): DofLayer[] {
  return layers
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const ca = engagementCostUsd(a.l)
      const cb = engagementCostUsd(b.l)
      return ca.loUsd - cb.loUsd || ca.hiUsd - cb.hiUsd || a.i - b.i
    })
    .map((x) => x.l)
}

function runCase(layers: readonly DofLayer[], raids: readonly number[], which: 'low' | 'high'): DofCase {
  const stock = layers.map((l) => (l.reusable ? Infinity : l.magazine))
  const dryDay: Record<string, number | null> = {}
  const roundsFired: Record<string, number> = {}
  for (const l of layers) {
    if (!l.reusable) dryDay[l.id] = null
    roundsFired[l.id] = 0
  }
  const expendable = layers.filter((l) => !l.reusable)
  let allDryDay: number | null = null
  let firstLeakerDay: number | null = null
  let cumThreats = 0
  let cumLeakers = 0
  let cumCostLo = 0
  let cumCostHi = 0
  const nights: DofNight[] = []

  raids.forEach((rawRaid, d) => {
    const day = d + 1
    const raid = Math.max(0, Number.isFinite(rawRaid) ? rawRaid : 0)
    if (d > 0) {
      layers.forEach((l, i) => {
        if (!l.reusable) stock[i] += l.resupplyPerDay
      })
    }

    let inbound = raid
    const perLayer: DofLayerNight[] = layers.map((l, i) => {
      const pk = which === 'low' ? l.pk.lo : l.pk.hi
      const reached = inbound
      const byRounds = l.reusable ? Infinity : stock[i] / l.roundsPerEngagement
      const engaged = Math.max(0, Math.min(inbound, byRounds, l.maxPerNight))
      const kills = engaged * pk
      const fired = l.reusable ? engaged : engaged * l.roundsPerEngagement
      if (!l.reusable) stock[i] = Math.max(0, stock[i] - fired)
      inbound = Math.max(0, inbound - kills)
      roundsFired[l.id] += fired
      cumCostLo += fired * l.costPerRoundUsd.loUsd
      cumCostHi += fired * l.costPerRoundUsd.hiUsd
      const dry = !l.reusable && byRounds < reached - EPS && byRounds < l.maxPerNight - EPS
      const empty = !l.reusable && stock[i] < l.roundsPerEngagement - EPS
      if (dry && dryDay[l.id] == null) dryDay[l.id] = day
      return { id: l.id, reached, engaged, kills, roundsFired: fired, roundsLeft: stock[i], dry, empty }
    })

    cumThreats += raid
    cumLeakers += inbound
    if (firstLeakerDay == null && cumLeakers >= FIRST_LEAKER_THRESHOLD - EPS) firstLeakerDay = day
    if (allDryDay == null && expendable.length > 0 && perLayer.every((n, i) => layers[i].reusable || n.empty)) {
      allDryDay = day
    }

    nights.push({
      day,
      raid,
      layers: perLayer,
      leakers: inbound,
      cumulativeThreats: cumThreats,
      cumulativeLeakers: cumLeakers,
      cumulativeCostUsd: { lo: cumCostLo, hi: cumCostHi },
    })
  })

  let firstDry: DofCase['firstDry'] = null
  for (const l of layers) {
    const d = dryDay[l.id]
    if (d != null && (firstDry == null || d < firstDry.day)) firstDry = { day: d, layerId: l.id }
  }

  return {
    pk: which,
    nights,
    dryDay,
    firstDry,
    allDryDay,
    firstLeakerDay,
    totalLeakers: cumLeakers,
    roundsFired,
    costUsd: { lo: cumCostLo, hi: cumCostHi },
  }
}

function exchangeBand(cost: Band, threats: number, threatCost: CostInterval): Band {
  if (threats <= 0) return { lo: 0, hi: 0 }
  return {
    lo: cost.lo / (threats * threatCost.hiUsd),
    hi: cost.hi / (threats * Math.max(threatCost.loUsd, 1)),
  }
}

/** Run the ladder over the raid schedule at both ends of every Pk band. */
export function runDaysOfFire(input: DofInput): DofResult {
  const raids = input.raids.slice(0, DOF_MAX_DAYS)
  const excluded: DofResult['excluded'] = []
  const usable: DofLayer[] = []
  for (const raw of input.layers) {
    const l = sanitise(raw)
    if (l.pk.hi <= 0) excluded.push({ id: l.id, label: l.label, reason: 'No Pk above zero on record against this threat' })
    else usable.push(l)
  }
  const layers = ladderOrder(usable)
  const low = runCase(layers, raids, 'low')
  const high = runCase(layers, raids, 'high')

  const days: DofDay[] = low.nights.map((ln, i) => {
    const hn = high.nights[i]
    const cost: Band = {
      lo: Math.min(ln.cumulativeCostUsd.lo, hn.cumulativeCostUsd.lo),
      hi: Math.max(ln.cumulativeCostUsd.hi, hn.cumulativeCostUsd.hi),
    }
    return {
      day: ln.day,
      raid: ln.raid,
      cumulativeThreats: ln.cumulativeThreats,
      leakers: { lo: Math.min(ln.leakers, hn.leakers), hi: Math.max(ln.leakers, hn.leakers) },
      cumulativeLeakers: {
        lo: Math.min(ln.cumulativeLeakers, hn.cumulativeLeakers),
        hi: Math.max(ln.cumulativeLeakers, hn.cumulativeLeakers),
      },
      cumulativeCostUsd: cost,
      exchange: exchangeBand(cost, ln.cumulativeThreats, input.threatCostUsd),
    }
  })

  const threats = raids.reduce((s, r) => s + Math.max(0, Number.isFinite(r) ? r : 0), 0)
  const costUsd: Band = {
    lo: Math.min(low.costUsd.lo, high.costUsd.lo),
    hi: Math.max(low.costUsd.hi, high.costUsd.hi),
  }
  return {
    layers,
    excluded,
    low,
    high,
    days,
    totals: {
      threats,
      leakers: {
        lo: Math.min(low.totalLeakers, high.totalLeakers),
        hi: Math.max(low.totalLeakers, high.totalLeakers),
      },
      costUsd,
      attackerCostUsd: { lo: threats * input.threatCostUsd.loUsd, hi: threats * input.threatCostUsd.hiUsd },
      exchange: exchangeBand(costUsd, threats, input.threatCostUsd),
    },
  }
}

// ── Raid schedule ───────────────────────────────────────────────────────────

/** An opening night, then a steady raid every night after. */
export function raidSchedule(openingNight: number, eachNight: number, days: number): number[] {
  const n = Math.max(1, Math.min(DOF_MAX_DAYS, Math.round(Number.isFinite(days) ? days : 1)))
  const first = Math.max(0, Number.isFinite(openingNight) ? openingNight : 0)
  const rest = Math.max(0, Number.isFinite(eachNight) ? eachNight : 0)
  return Array.from({ length: n }, (_, i) => (i === 0 ? first : rest))
}

// ── Ladder from data ────────────────────────────────────────────────────────

export interface LadderOption {
  effector: CostEntry
  pk: PkBand
}

/**
 * Effectors with a Pk on record against the threat, in the cost-exchange
 * ranking order shown on the economics page (cheapest exchange first).
 */
export function ladderOptions(threatId: string, evidence: readonly PkEvidence[]): LadderOption[] {
  const bands = pkBandsFor(threatId, evidence)
  const out: LadderOption[] = []
  for (const x of recommendedAgainst(threatId, 99)) {
    const band = bands.get(x.effector.id)
    if (band && band.hi > 0) out.push({ effector: x.effector, pk: band })
  }
  return out
}

/** Threats the model can run: at least one expendable layer with a Pk on record. */
export function threatsWithLadder(evidence: readonly PkEvidence[]): CostEntry[] {
  return COST_ENTRIES.filter(
    (c) => c.side === 'threat' && ladderOptions(c.id, evidence).some((o) => !o.effector.reusable),
  )
}

// ── Planner settings ────────────────────────────────────────────────────────

/** One layer's planning assumptions. */
export interface DofLayerSetting {
  on: boolean
  /** Rounds on hand before night 1. */
  magazine: number
  /** Rounds delivered each day from day 2. */
  resupplyPerDay: number
  /** Engagements per night; null means no limit beyond the magazine. */
  maxPerNight: number | null
  /** Rounds per engagement (gun burst length). */
  roundsPerEngagement: number
}

export type DofSettings = Record<string, DofLayerSetting>

/**
 * Starting values when a layer is switched on with nothing set. These are
 * placeholders for the planner to overwrite, not holdings of any force.
 */
export function defaultSetting(effector: CostEntry): DofLayerSetting {
  if (effector.reusable) return { on: false, magazine: 0, resupplyPerDay: 0, maxPerNight: 20, roundsPerEngagement: 1 }
  if (effector.id === 'gun-35mm') {
    return { on: false, magazine: 1_000, resupplyPerDay: 0, maxPerNight: null, roundsPerEngagement: 20 }
  }
  return { on: false, magazine: 12, resupplyPerDay: 0, maxPerNight: null, roundsPerEngagement: 1 }
}

export function settingFor(settings: DofSettings, effector: CostEntry): DofLayerSetting {
  return { ...defaultSetting(effector), ...(settings[effector.id] ?? {}) }
}

/**
 * Effectors whose cost-table figure is per round while the Defeat Matrix Pk is
 * per engagement (a burst). Only these take a rounds-per-engagement input; a
 * missile's recorded Pk is for one round, so firing two would need a
 * different Pk, not just a second price.
 */
export function isBurstWeapon(effectorId: string): boolean {
  return effectorId === 'gun-35mm'
}

/** Short names for chart legends and table headers. */
export const DOF_SHORT_LABEL: Record<string, string> = {
  'rf-jammer': 'RF jammer',
  hpm: 'HPM',
  'hel-laser': 'Laser',
  'gun-35mm': '35mm gun',
  apkws: 'APKWS',
  'coyote-b2': 'Coyote Blk 2',
  'amraam-nasams': 'NASAMS',
  'sm-2': 'SM-2',
  'sm-6': 'SM-6',
  'pac3-mse': 'PAC-3 MSE',
}

/**
 * UI copy carries no em dashes. Source notes in the cost table still have one
 * or two; this swaps them for a colon at display time.
 */
export function plainCopy(s: string): string {
  return s.replace(/\s*\u2014\s*/g, ': ')
}

export function shortLabel(id: string, fallback = id): string {
  return DOF_SHORT_LABEL[id] ?? fallback
}

export function layerFromOption(option: LadderOption, setting: DofLayerSetting): DofLayer {
  const e = option.effector
  return {
    id: e.id,
    label: e.label,
    costPerRoundUsd: e.perEngagementUsd,
    roundsPerEngagement: isBurstWeapon(e.id) ? setting.roundsPerEngagement : 1,
    pk: { lo: option.pk.lo, hi: option.pk.hi },
    reusable: e.reusable,
    magazine: e.reusable ? 0 : setting.magazine,
    resupplyPerDay: e.reusable ? 0 : setting.resupplyPerDay,
    maxPerNight: setting.maxPerNight == null ? Infinity : setting.maxPerNight,
  }
}

export function layersFromSettings(options: readonly LadderOption[], settings: DofSettings): DofLayer[] {
  return options
    .filter((o) => settingFor(settings, o.effector).on)
    .map((o) => layerFromOption(o, settingFor(settings, o.effector)))
}

export interface ReusableComparison {
  /** Effector ids of the reusable layers in the "with" run. */
  reusableIds: string[]
  /** True when the planner had no reusable layer on and the comparison adds them. */
  added: boolean
  withReusable: DofResult
  kineticOnly: DofResult
}

/**
 * The same raid and magazines with and without the reusable layer. If the
 * planner has switched no reusable layer on, every reusable layer with a Pk on
 * record is added at its current nightly limit, so the question can still be
 * asked. Returns null when there is no reusable option at all.
 */
export function compareReusable(
  options: readonly LadderOption[],
  settings: DofSettings,
  raids: readonly number[],
  threatCostUsd: CostInterval,
): ReusableComparison | null {
  const reusableOptions = options.filter((o) => o.effector.reusable)
  if (!reusableOptions.length) return null
  const kinetic = layersFromSettings(options, settings).filter((l) => !l.reusable)
  let reusable = layersFromSettings(options, settings).filter((l) => l.reusable)
  const added = reusable.length === 0
  if (added) reusable = reusableOptions.map((o) => layerFromOption(o, settingFor(settings, o.effector)))
  return {
    reusableIds: reusable.map((l) => l.id),
    added,
    withReusable: runDaysOfFire({ threatCostUsd, raids, layers: [...reusable, ...kinetic] }),
    kineticOnly: runDaysOfFire({ threatCostUsd, raids, layers: kinetic }),
  }
}

// ── Illustrative presets ────────────────────────────────────────────────────

export interface DofPreset {
  id: string
  label: string
  /** Why the numbers look like this. Always shown as illustrative. */
  note: string
  threatId: string
  openingNight: number
  eachNight: number
  days: number
  settings: DofSettings
}

const on = (s: Partial<DofLayerSetting>): DofLayerSetting => ({
  on: true,
  magazine: 0,
  resupplyPerDay: 0,
  maxPerNight: null,
  roundsPerEngagement: 1,
  ...s,
})

/**
 * Illustrative inputs only. Raid sizes echo the public shape of events (a
 * deployed base hit by repeated Shahed-class raids; Gulf states reporting
 * more than 1,500 rockets and drones shot down), but magazines, resupply and
 * nightly limits are invented for the exercise and describe no real force.
 */
export const DOF_PRESETS: DofPreset[] = [
  {
    id: 'deployed-base',
    label: 'Deployed base: nightly Shahed-class raids (Al Minhad pattern)',
    note: 'A small raid most nights against a deployed air base section defended by a host-nation layer. Illustrative inputs.',
    threatId: 'shahed-136',
    openingNight: 12,
    eachNight: 4,
    days: 30,
    settings: {
      'rf-jammer': on({ maxPerNight: 10 }),
      'gun-35mm': on({ magazine: 1_200, resupplyPerDay: 40, roundsPerEngagement: 20 }),
      apkws: on({ magazine: 24, resupplyPerDay: 0 }),
      'amraam-nasams': on({ magazine: 12, resupplyPerDay: 0 }),
      'pac3-mse': on({ magazine: 16, resupplyPerDay: 0 }),
    },
  },
  {
    id: 'northern-base',
    label: 'Northern base: OWA saturation',
    note: 'A heavy opening raid of one-way attack drones on a northern air base, then sustained pressure. Illustrative inputs.',
    threatId: 'shahed-136',
    openingNight: 40,
    eachNight: 12,
    days: 21,
    settings: {
      'rf-jammer': on({ maxPerNight: 15 }),
      'gun-35mm': on({ magazine: 2_000, resupplyPerDay: 100, roundsPerEngagement: 20 }),
      apkws: on({ magazine: 48, resupplyPerDay: 4 }),
      'coyote-b2': on({ magazine: 16, resupplyPerDay: 0 }),
      'amraam-nasams': on({ magazine: 24, resupplyPerDay: 0 }),
    },
  },
  {
    id: 'gulf-scale',
    label: 'Gulf scale: 1,500 threats over 30 days',
    note: '50 threats a night for 30 nights against a large layered defence with steady resupply. Illustrative inputs.',
    threatId: 'shahed-136',
    openingNight: 50,
    eachNight: 50,
    days: 30,
    settings: {
      'rf-jammer': on({ maxPerNight: 20 }),
      'hel-laser': on({ maxPerNight: 10 }),
      'gun-35mm': on({ magazine: 6_000, resupplyPerDay: 400, roundsPerEngagement: 20 }),
      apkws: on({ magazine: 120, resupplyPerDay: 8 }),
      'coyote-b2': on({ magazine: 40, resupplyPerDay: 2 }),
      'amraam-nasams': on({ magazine: 48, resupplyPerDay: 2 }),
      'sm-2': on({ magazine: 32, resupplyPerDay: 0 }),
      'pac3-mse': on({ magazine: 64, resupplyPerDay: 2 }),
    },
  },
]
