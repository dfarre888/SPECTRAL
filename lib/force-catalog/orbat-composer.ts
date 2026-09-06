/**
 * ORBAT composer rollup.
 *
 * Answers the question a force-design conversation actually turns on: if I take
 * these platforms out of the package, what happens to my picture?
 *
 * Selecting or dropping a platform changes three things at once, and they are
 * easy to reason about separately and impossible to hold together by eye:
 *
 *   Bands      — how many platforms sit on HF, VHF, UHF, L, Ku and so on. Drop
 *                every HF-capable airframe and the package loses its only
 *                beyond-line-of-sight voice path, which no headline count shows.
 *   Tiers      — how many can exchange machine tracks versus only voice. See
 *                lib/coalition/interop.ts; a vehicle on a combat-net radio is
 *                voice-connected, not absent.
 *   Spectrum   — which sensor bands the package still covers. Losing the only
 *                L-band AEW radar is a different loss from losing one of six
 *                X-band fire-control sets.
 *
 * Pure data, no React, so the rollup is testable and the UI stays a renderer.
 */

import { tierForKind, type ConnTier } from '@/lib/coalition/datalink-matrix'

export interface ComposerBearer {
  kind: string
  standard: string | null
  band: string | null
}

export interface ComposerSensor {
  band: string | null
  kind?: string | null
}

export interface ComposerPlatform {
  id: string
  label: string
  domain: string
  role: string
  comms: ComposerBearer[]
  sensors: ComposerSensor[]
}

export interface BandRollup {
  band: string
  platformCount: number
  platformIds: string[]
  /** Distinct bearer kinds or sensor kinds seen on this band. */
  kinds: string[]
}

export interface TierRollup {
  track: number
  data: number
  voice: number
  none: number
}

export interface OrbatRollup {
  selectedCount: number
  totalCount: number
  commsBands: BandRollup[]
  sensorBands: BandRollup[]
  tiers: TierRollup
  /** Selected platforms with no comms fit recorded at all. */
  noCommsIds: string[]
  /** Selected platforms with no sensor fit recorded at all. */
  noSensorIds: string[]
  /**
   * Bands held by exactly one selected platform. These are the single points of
   * failure a planner needs flagged, because losing that one airframe removes
   * the band entirely.
   */
  singlePointBands: string[]
}

/** Canonical ordering so the UI reads low frequency to high, not alphabetically. */
export const BAND_ORDER = ['HF', 'VHF', 'UHF', 'L', 'S', 'C', 'X', 'Ku', 'Ka', 'IR', 'EO', 'VIS', 'UV']

export function sortBands(bands: readonly string[]): string[] {
  return [...bands].sort((a, b) => {
    const ia = BAND_ORDER.indexOf(a)
    const ib = BAND_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

/** Voice bearers carry their band in the kind (voice_uhf) rather than the band field. */
function bandForBearer(b: ComposerBearer): string | null {
  if (b.band) return b.band
  const m = b.kind.match(/^voice_(\w+)$/)
  if (m) return m[1].toUpperCase()
  if (b.kind === 'data_satcom') return 'Ku'
  return null
}

function rollupBands(
  entries: { platformId: string; band: string | null; kind: string }[],
): BandRollup[] {
  const map = new Map<string, { ids: Set<string>; kinds: Set<string> }>()
  for (const e of entries) {
    if (!e.band) continue
    if (!map.has(e.band)) map.set(e.band, { ids: new Set(), kinds: new Set() })
    map.get(e.band)!.ids.add(e.platformId)
    map.get(e.band)!.kinds.add(e.kind)
  }
  return sortBands([...map.keys()]).map((band) => {
    const v = map.get(band)!
    return {
      band,
      platformCount: v.ids.size,
      platformIds: [...v.ids].sort(),
      kinds: [...v.kinds].sort(),
    }
  })
}

export function composeOrbat(
  platforms: readonly ComposerPlatform[],
  selectedIds: ReadonlySet<string>,
): OrbatRollup {
  const selected = platforms.filter((p) => selectedIds.has(p.id))

  const commsEntries = selected.flatMap((p) =>
    p.comms.map((b) => ({ platformId: p.id, band: bandForBearer(b), kind: b.kind })),
  )
  const sensorEntries = selected.flatMap((p) =>
    p.sensors.map((s) => ({ platformId: p.id, band: s.band, kind: s.kind ?? 'sensor' })),
  )

  const tiers: TierRollup = { track: 0, data: 0, voice: 0, none: 0 }
  for (const p of selected) {
    let best: ConnTier = 'none'
    const rank: Record<ConnTier, number> = { track: 0, data: 1, voice: 2, none: 3 }
    for (const b of p.comms) {
      const t = tierForKind(b.kind, b.standard)
      if (rank[t] < rank[best]) best = t
    }
    tiers[best]++
  }

  const commsBands = rollupBands(commsEntries)

  return {
    selectedCount: selected.length,
    totalCount: platforms.length,
    commsBands,
    sensorBands: rollupBands(sensorEntries),
    tiers,
    noCommsIds: selected.filter((p) => p.comms.length === 0).map((p) => p.id).sort(),
    noSensorIds: selected.filter((p) => p.sensors.length === 0).map((p) => p.id).sort(),
    singlePointBands: commsBands.filter((b) => b.platformCount === 1).map((b) => b.band),
  }
}

/**
 * What changes between two package compositions.
 *
 * Framed as a delta because that is how the decision is made — not "this package
 * has four HF platforms" but "dropping these two costs you HF entirely".
 */
export interface RollupDelta {
  bandsLost: string[]
  bandsGained: string[]
  trackDelta: number
  selectedDelta: number
}

export function diffRollups(before: OrbatRollup, after: OrbatRollup): RollupDelta {
  const b = new Set(before.commsBands.map((x) => x.band))
  const a = new Set(after.commsBands.map((x) => x.band))
  return {
    bandsLost: sortBands([...b].filter((x) => !a.has(x))),
    bandsGained: sortBands([...a].filter((x) => !b.has(x))),
    trackDelta: after.tiers.track - before.tiers.track,
    selectedDelta: after.selectedCount - before.selectedCount,
  }
}
