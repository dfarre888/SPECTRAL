/**
 * BMI interoperability solver — who can talk to whom, via gateway or direct.
 */

import type {
  CommsBearer,
  DatalinkStandard,
  GatewayNode,
  InteropGraph,
  InteropLink,
  PlatformCommsFit,
} from '@/lib/bmi/bmi-types'

function bearerKey(b: CommsBearer): string {
  if (b.kind === 'datalink' && b.standard) {
    return `datalink:${b.standard}:${b.band}`
  }
  return `${b.kind}:${b.band}`
}

function sharedBearers(a: CommsBearer[], b: CommsBearer[]): CommsBearer[] {
  const bKeys = new Set(b.map(bearerKey))
  return a.filter((x) => bKeys.has(bearerKey(x)))
}

function findGateway(
  a: CommsBearer[],
  b: CommsBearer[],
  all: PlatformCommsFit[],
  aId: string,
  bId: string,
): { gateway_id: string; via: CommsBearer[] } | null {
  for (const g of all) {
    if (g.platform_id === aId || g.platform_id === bId) continue
    const gDatalinks = g.bearers.filter((x) => x.kind === 'datalink' && x.gateway_capable)
    if (!gDatalinks.length) continue
    for (const gd of gDatalinks) {
      const std = gd.standard
      if (!std) continue
      const aHas = a.some((x) => x.standard === std || (x.gateway_capable && x.standard === std))
      const bHas = b.some((x) => x.standard === std)
      if (aHas && bHas) {
        return { gateway_id: g.platform_id, via: [gd] }
      }
      // MADL + Link16 bridge: gateway has Link16, one side MADL-only, other Link16-only
      const aMadl = a.some((x) => x.standard === 'madl')
      const bLink16 = b.some((x) => x.standard === 'link16')
      const aLink16 = a.some((x) => x.standard === 'link16')
      const bMadl = b.some((x) => x.standard === 'madl')
      if (gd.standard === 'link16' && gd.gateway_capable) {
        if ((aMadl && bLink16) || (aLink16 && bMadl)) {
          return { gateway_id: g.platform_id, via: [gd] }
        }
      }
    }
  }
  return null
}

export class InteropSolver {
  canCommunicate(a: PlatformCommsFit, b: PlatformCommsFit, all: PlatformCommsFit[]): InteropLink {
    const shared = sharedBearers(a.bearers, b.bearers)
    const sharedDatalinks = shared.filter((x) => x.kind === 'datalink')
    const sharedVoice = shared.filter((x) => x.kind.startsWith('voice_'))

    if (sharedDatalinks.length > 0) {
      const primary = sharedDatalinks[0]!
      return {
        a_id: a.platform_id,
        b_id: b.platform_id,
        method: 'direct',
        shared_bearers: sharedDatalinks.map((x) => x.label),
        comsec_caveat: sharedDatalinks.some((x) => !!x.comsec_note),
        pnt_caveat: sharedDatalinks.some((x) => x.pnt_dependent),
        note: `Direct datalink: ${sharedDatalinks.map((x) => x.label).join(', ')}`,
      }
    }

    const gateway = findGateway(a.bearers, b.bearers, all, a.platform_id, b.platform_id)
    if (gateway) {
      return {
        a_id: a.platform_id,
        b_id: b.platform_id,
        method: 'via_gateway',
        shared_bearers: gateway.via.map((x) => x.label),
        gateway_id: gateway.gateway_id,
        comsec_caveat: gateway.via.some((x) => !!x.comsec_note),
        pnt_caveat: gateway.via.some((x) => x.pnt_dependent),
        note: `Bridged via ${gateway.gateway_id}`,
      }
    }

    if (sharedVoice.length > 0) {
      return {
        a_id: a.platform_id,
        b_id: b.platform_id,
        method: 'voice_only',
        shared_bearers: sharedVoice.map((x) => x.label),
        comsec_caveat: false,
        pnt_caveat: false,
        note: `Voice only: ${sharedVoice.map((x) => x.label).join(', ')}`,
      }
    }

    return {
      a_id: a.platform_id,
      b_id: b.platform_id,
      method: 'none',
      shared_bearers: [],
      comsec_caveat: false,
      pnt_caveat: false,
      note: 'No common bearer — interop gap',
    }
  }

  buildGraph(fits: PlatformCommsFit[]): InteropGraph {
    const links: InteropLink[] = []
    const gatewayDependent = new Set<string>()
    const isolatedPairs: { a_id: string; b_id: string }[] = []

    for (let i = 0; i < fits.length; i++) {
      for (let j = i + 1; j < fits.length; j++) {
        const a = fits[i]!
        const b = fits[j]!
        const link = this.canCommunicate(a, b, fits)
        links.push(link)
        if (link.method === 'via_gateway') {
          const madlOnly =
            (a.bearers.some((x) => x.standard === 'madl') &&
              !a.bearers.some((x) => x.standard === 'link16')) ||
            (b.bearers.some((x) => x.standard === 'madl') &&
              !b.bearers.some((x) => x.standard === 'link16'))
          if (madlOnly) {
            gatewayDependent.add(a.platform_id)
            gatewayDependent.add(b.platform_id)
          }
        }
        if (link.method === 'none') {
          isolatedPairs.push({ a_id: a.platform_id, b_id: b.platform_id })
        }
      }
    }

    return {
      links,
      gateway_dependent: [...gatewayDependent],
      isolated_pairs: isolatedPairs,
    }
  }

  findGateways(fits: PlatformCommsFit[]): GatewayNode[] {
    const gateways: GatewayNode[] = []
    for (const g of fits) {
      if (!g.bearers.some((b) => b.gateway_capable)) continue
      const bridges = new Set<string>()
      for (let i = 0; i < fits.length; i++) {
        for (let j = i + 1; j < fits.length; j++) {
          const a = fits[i]!
          const b = fits[j]!
          const link = this.canCommunicate(a, b, fits)
          if (link.method === 'via_gateway' && link.gateway_id === g.platform_id) {
            bridges.add(a.platform_id)
            bridges.add(b.platform_id)
          }
        }
      }
      if (bridges.size > 0) {
        gateways.push({ gateway_id: g.platform_id, bridges: [...bridges] })
      }
    }
    return gateways
  }
}

export const interopSolver = new InteropSolver()

/** Datalink priority for PACE ranking */
export const DATALINK_PRIORITY: DatalinkStandard[] = [
  'link16',
  'link22',
  'link11',
  'madl',
  'national',
  'sadl',
  'ifdl',
  'none',
]
