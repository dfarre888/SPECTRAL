/**
 * Instrument row for the Force Catalogue: the five numbers a commander reads
 * first. Pure. Track reach and GNSS-denial reach come from the interop engine;
 * the single point of failure is found by benching each gateway-capable unit
 * in turn and measuring the drop in Blue track reach.
 */
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { analyseInterop, analyseInteropUnderGnssDenial, type InteropResult } from '@/lib/coalition/interop'
import { toInteropPlatforms } from '@/lib/coalition/catalog-adapter'
import { sensorsStatus } from '@/lib/force-catalog/spectrum-bands'

export interface SinglePointOfFailure {
  id: string
  short_name: string
  /** Track reach lost (points) when this unit is benched. */
  reachDropPct: number
  /** Units that fall off the largest picture without it. */
  strandedCount: number
}

export interface ForceInstruments {
  blue: { count: number; nations: number; sensorGaps: number }
  red: { count: number; nations: number; nationalOnly: number }
  track: { reachPct: number; islands: number; participants: number }
  denied: { reachPct: number; dropPts: number; dropToVoice: number }
  spof: SinglePointOfFailure | null
  /** Nets that split into more than one island on the same standard. */
  variantSplits: { standard: string; islands: number }[]
  interop: InteropResult
}

const SPOF_CANDIDATES = 40

function largestIsland(r: InteropResult): Set<string> {
  let best: string[] = []
  for (const i of r.track.islands) if (i.memberIds.length > best.length) best = i.memberIds
  return new Set(best)
}

export function buildForceInstruments(platforms: ForceCatalogPlatformFull[]): ForceInstruments {
  const blue = platforms.filter((p) => p.force_side === 'blue')
  const red = platforms.filter((p) => p.force_side === 'red')

  const blueInterop = analyseInterop(toInteropPlatforms(blue))
  const blueDenied = analyseInteropUnderGnssDenial(toInteropPlatforms(blue))
  const beforeTrack = new Set(blueInterop.track.participantIds)
  const afterTrack = new Set(blueDenied.track.participantIds)
  const dropToVoice = [...beforeTrack].filter((id) => !afterTrack.has(id)).length

  // Single point of failure: gateway-capable Blue units, most-connected first.
  const candidates = blue
    .filter((p) => p.comms.some((c) => c.gateway_capable))
    .sort((a, b) => b.comms.length - a.comms.length)
    .slice(0, SPOF_CANDIDATES)
  const baseIsland = largestIsland(blueInterop)
  let spof: SinglePointOfFailure | null = null
  for (const c of candidates) {
    const without = analyseInterop(toInteropPlatforms(blue.filter((p) => p.id !== c.id)))
    const drop = blueInterop.track.reachPct - without.track.reachPct
    if (drop <= 0) continue
    const stranded = [...baseIsland].filter((id) => id !== c.id && !largestIsland(without).has(id)).length
    if (!spof || drop > spof.reachDropPct) spof = { id: c.id, short_name: c.short_name, reachDropPct: drop, strandedCount: stranded }
  }

  // Variant splits: same standard, more than one island holding it.
  const byStd = new Map<string, Set<string>>()
  for (const isl of blueInterop.track.islands) {
    for (const k of isl.netKeys) {
      if (!k.startsWith('std:')) continue
      const std = k.slice(4).split('/')[0]
      if (!byStd.has(std)) byStd.set(std, new Set())
      byStd.get(std)!.add(isl.id)
    }
  }
  const variantSplits = [...byStd.entries()].filter(([, s]) => s.size > 1).map(([standard, s]) => ({ standard, islands: s.size }))

  return {
    blue: { count: blue.length, nations: new Set(blue.map((p) => p.nation_code)).size, sensorGaps: blue.filter((p) => sensorsStatus(p) === 'gap').length },
    red: {
      count: red.length,
      nations: new Set(red.map((p) => p.nation_code)).size,
      nationalOnly: red.filter((p) => p.comms.some((c) => c.standard === 'national') && !p.comms.some((c) => c.standard && c.standard !== 'national' && c.standard !== 'none')).length,
    },
    track: { reachPct: blueInterop.track.reachPct, islands: blueInterop.track.islands.length, participants: blueInterop.track.participantIds.length },
    denied: { reachPct: blueDenied.track.reachPct, dropPts: blueInterop.track.reachPct - blueDenied.track.reachPct, dropToVoice },
    spof,
    variantSplits,
    interop: blueInterop,
  }
}
