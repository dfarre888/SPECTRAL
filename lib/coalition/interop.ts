/**
 * Coalition connectivity.
 *
 * Combining nations is not addition. Two air forces of forty aircraft are one
 * force if they share a track network and two forces if they do not.
 *
 * Connectivity is scored in tiers rather than as a single number, because those
 * tiers answer different questions:
 *
 *   track — machine-to-machine track exchange. Drives fused air pictures,
 *           cued intercepts and cooperative engagement.
 *   data  — non-track digital traffic (SATCOM data). Orders and reports move;
 *           a live track picture does not.
 *   voice — HF/VHF/UHF/SATCOM voice. A human relays what a machine cannot.
 *
 * A protected mobility vehicle on a combat-net radio is not "isolated" — it is
 * voice-connected and cannot receive machine tracks. Reporting one number hides
 * exactly the distinction a planner needs.
 *
 * Pure data — no React, no DB — so the graph semantics stay testable in node.
 */

import {
  betterTier,
  gatewayBridges,
  nativeBridges,
  specFor,
  tierForKind,
  type ConnTier,
} from '@/lib/coalition/datalink-matrix'

export interface InteropBearer {
  standard: string | null
  kind: string
  gatewayCapable: boolean
  pntDependent: boolean
  label: string
}

export interface InteropPlatform {
  id: string
  label: string
  nationCode: string
  bearers: InteropBearer[]
}

export interface InteropNet {
  key: string
  tier: ConnTier
  label: string
  /** Nation code for indigenous links; null for coalition-wide nets. */
  scope: string | null
  memberIds: string[]
}

export interface InteropIsland {
  id: string
  memberIds: string[]
  nations: string[]
  netKeys: string[]
}

export interface TierResult {
  tier: ConnTier
  nets: InteropNet[]
  islands: InteropIsland[]
  /** Platforms holding at least one bearer at this tier. */
  participantIds: string[]
  /** participants / all platforms, 0-100. */
  coveragePct: number
  /** Largest island / participants, 0-100 — how unified those who can are. */
  cohesionPct: number
  /**
   * Largest island / ALL platforms, 0-100.
   *
   * The honest headline. cohesionPct alone flatters a collapsed force: strip a
   * coalition down to three surviving units on one net and cohesion still reads
   * 100%. reachPct is the share of the whole force on the single largest
   * picture, so it falls when participants fall.
   */
  reachPct: number
}

export interface InteropResult {
  platformCount: number
  track: TierResult
  data: TierResult
  voice: TierResult
  /** Best tier each platform reaches. */
  tierByPlatform: Record<string, ConnTier>
  /** Platforms with no bearer of any kind — genuinely out of the net. */
  unconnectedIds: string[]
}

class UnionFind {
  private parent = new Map<string, string>()
  find(a: string): string {
    if (!this.parent.has(a)) this.parent.set(a, a)
    let r = this.parent.get(a)!
    while (r !== this.parent.get(r)!) r = this.parent.get(r)!
    return r
  }
  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

/** Nets are keyed so indigenous links stay nation-scoped and voice groups by band. */
function netKeyFor(b: InteropBearer, nationCode: string): { key: string; label: string; scope: string | null } | null {
  const tier = tierForKind(b.kind, b.standard)
  if (tier === 'none') return null

  if (tier === 'track') {
    const spec = specFor(b.standard)
    if (!spec) return null
    if (spec.nationScoped) {
      return { key: `national:${nationCode}`, label: `${spec.label} (${nationCode})`, scope: nationCode }
    }
    return { key: `std:${spec.standard}`, label: spec.label, scope: null }
  }

  if (tier === 'data') return { key: 'data:satcom', label: 'SATCOM data', scope: null }

  // Voice interoperates by band: two radios on the same band can be worked.
  const band = (b.label.match(/\b(HF|VHF|UHF|SATCOM)\b/i)?.[1] ?? b.kind.replace('voice_', '')).toUpperCase()
  return { key: `voice:${band}`, label: `${band} voice`, scope: null }
}

function buildTier(platforms: InteropPlatform[], tier: ConnTier): TierResult {
  const nets = new Map<string, InteropNet>()
  const platformNets = new Map<string, string[]>()
  const participants: string[] = []

  for (const p of platforms) {
    const keys: string[] = []
    for (const b of p.bearers) {
      if (tierForKind(b.kind, b.standard) !== tier) continue
      const nk = netKeyFor(b, p.nationCode)
      if (!nk) continue
      if (!nets.has(nk.key)) {
        nets.set(nk.key, { key: nk.key, tier, label: nk.label, scope: nk.scope, memberIds: [] })
      }
      nets.get(nk.key)!.memberIds.push(p.id)
      keys.push(nk.key)
    }
    if (keys.length > 0) {
      participants.push(p.id)
      platformNets.set(p.id, keys)
    }
  }

  const uf = new UnionFind()
  for (const k of nets.keys()) uf.find(k)

  if (tier === 'track') {
    // Standards specified to interwork join with no relay present.
    for (const br of nativeBridges()) {
      const ka = `std:${br.a}`
      const kb = `std:${br.b}`
      if (nets.has(ka) && nets.has(kb)) uf.union(ka, kb)
    }
    // Bridges needing a relay apply only where a fitted platform carries both.
    for (const p of platforms) {
      const held = new Set(
        p.bearers.filter((b) => tierForKind(b.kind, b.standard) === 'track').map((b) => b.standard),
      )
      const canRelay = p.bearers.some((b) => b.gatewayCapable && tierForKind(b.kind, b.standard) === 'track')
      if (!canRelay) continue
      for (const br of gatewayBridges()) {
        if (held.has(br.a) && held.has(br.b)) {
          const ka = specFor(br.a)?.nationScoped ? `national:${p.nationCode}` : `std:${br.a}`
          const kb = specFor(br.b)?.nationScoped ? `national:${p.nationCode}` : `std:${br.b}`
          if (nets.has(ka) && nets.has(kb)) uf.union(ka, kb)
        }
      }
    }
  }

  const grouped = new Map<string, string[]>()
  for (const k of nets.keys()) {
    const root = uf.find(k)
    if (!grouped.has(root)) grouped.set(root, [])
    grouped.get(root)!.push(k)
  }

  const byId = new Map(platforms.map((p) => [p.id, p]))
  const islands: InteropIsland[] = []
  for (const [root, keys] of grouped) {
    const members = new Set<string>()
    for (const k of keys) for (const id of nets.get(k)!.memberIds) members.add(id)
    const memberIds = [...members].sort()
    islands.push({
      id: root,
      memberIds,
      nations: [...new Set(memberIds.map((id) => byId.get(id)?.nationCode ?? '?'))].sort(),
      netKeys: keys.sort(),
    })
  }
  islands.sort((a, b) => b.memberIds.length - a.memberIds.length || a.id.localeCompare(b.id))

  const largest = islands[0]?.memberIds.length ?? 0
  return {
    tier,
    nets: [...nets.values()].sort((a, b) => b.memberIds.length - a.memberIds.length),
    islands,
    participantIds: participants.sort(),
    coveragePct: platforms.length === 0 ? 0 : Math.round((participants.length / platforms.length) * 100),
    cohesionPct: participants.length === 0 ? 0 : Math.round((largest / participants.length) * 100),
    reachPct: platforms.length === 0 ? 0 : Math.round((largest / platforms.length) * 100),
  }
}

export function analyseInterop(platforms: InteropPlatform[]): InteropResult {
  const track = buildTier(platforms, 'track')
  const data = buildTier(platforms, 'data')
  const voice = buildTier(platforms, 'voice')

  const tierByPlatform: Record<string, ConnTier> = {}
  const unconnectedIds: string[] = []
  for (const p of platforms) {
    let best: ConnTier = 'none'
    for (const b of p.bearers) best = betterTier(best, tierForKind(b.kind, b.standard))
    tierByPlatform[p.id] = best
    if (best === 'none') unconnectedIds.push(p.id)
  }

  return { platformCount: platforms.length, track, data, voice, tierByPlatform, unconnectedIds: unconnectedIds.sort() }
}

/**
 * Re-run with GNSS-dependent bearers removed.
 *
 * This is the pessimistic bound, not a forecast: it models total, immediate loss
 * of every PNT-dependent bearer. Real terminals hold net time for a period after
 * GNSS is lost, so treat the gap between nominal and denied as the exposure, and
 * the ordering between coalitions as the finding.
 */
export function analyseInteropUnderGnssDenial(platforms: InteropPlatform[]): InteropResult {
  return analyseInterop(platforms.map((p) => ({ ...p, bearers: p.bearers.filter((b) => !b.pntDependent) })))
}

export interface InteropDelta {
  nominal: InteropResult
  denied: InteropResult
  /** Track-tier reach lost, in points — the meaningful denial measure. */
  trackReachDropPct: number
  /** Track-tier cohesion lost, in points. Reported for completeness. */
  trackCohesionDropPct: number
  /** Platforms that drop out of the track tier entirely. */
  lostTrackIds: string[]
}

export function interopUnderDenial(platforms: InteropPlatform[]): InteropDelta {
  const nominal = analyseInterop(platforms)
  const denied = analyseInteropUnderGnssDenial(platforms)
  const before = new Set(nominal.track.participantIds)
  const after = new Set(denied.track.participantIds)
  return {
    nominal,
    denied,
    trackReachDropPct: nominal.track.reachPct - denied.track.reachPct,
    trackCohesionDropPct: nominal.track.cohesionPct - denied.track.cohesionPct,
    lostTrackIds: [...before].filter((id) => !after.has(id)).sort(),
  }
}
