/**
 * BMI PACE plan builder — Primary / Alternate / Contingency / Emergency comms ladder.
 */

import type {
  CommsBearer,
  PaceEntry,
  PacePlan,
  PaceTier,
  PlatformCommsFit,
} from '@/lib/bmi/bmi-types'
import { DATALINK_PRIORITY, InteropSolver, interopSolver } from '@/lib/bmi/interopSolver'

const TIERS: PaceTier[] = ['primary', 'alternate', 'contingency', 'emergency']

function datalinkRank(b: CommsBearer): number {
  if (b.kind !== 'datalink' || !b.standard) return 99
  const idx = DATALINK_PRIORITY.indexOf(b.standard)
  return idx >= 0 ? idx : 50
}

function rankBearers(bearers: CommsBearer[]): CommsBearer[] {
  return [...bearers].sort((a, b) => {
    const da = datalinkRank(a)
    const db = datalinkRank(b)
    if (da !== db) return da - db
    if (a.kind.startsWith('voice_') && !b.kind.startsWith('voice_')) return 1
    if (!a.kind.startsWith('voice_') && b.kind.startsWith('voice_')) return -1
    return 0
  })
}

function tierRationale(tier: PaceTier, b: CommsBearer): string {
  switch (tier) {
    case 'primary':
      return b.kind === 'datalink'
        ? 'Best shared datalink — highest SA capacity'
        : 'Primary voice when no datalink common'
    case 'alternate':
      return b.kind === 'datalink'
        ? 'Secondary datalink or secure SATCOM voice path'
        : 'Alternate secure voice (UHF/SATCOM)'
    case 'contingency':
      return 'HF long-range resilient voice — low-tech backup'
    case 'emergency':
      return 'Guard/UHF emergency net — pre-briefed'
    default:
      return ''
  }
}

function pickForTier(
  tier: PaceTier,
  ranked: CommsBearer[],
  used: Set<string>,
): CommsBearer | null {
  const available = ranked.filter((b) => !used.has(b.id))
  if (!available.length) return null

  switch (tier) {
    case 'primary': {
      const dl = available.find((b) => b.kind === 'datalink')
      return dl ?? available[0] ?? null
    }
    case 'alternate': {
      const dl = available.find((b) => b.kind === 'datalink' && b.standard !== 'link16')
      const sat = available.find((b) => b.kind === 'voice_satcom' || b.kind === 'data_satcom')
      const uhf = available.find((b) => b.kind === 'voice_uhf')
      return dl ?? sat ?? uhf ?? available[0] ?? null
    }
    case 'contingency':
      return available.find((b) => b.kind === 'voice_hf') ?? available.find((b) => b.kind === 'voice_uhf') ?? null
    case 'emergency':
      return available.find((b) => b.kind === 'voice_uhf') ?? available[0] ?? null
    default:
      return null
  }
}

function sharedBetween(a: PlatformCommsFit, b: PlatformCommsFit): CommsBearer[] {
  const bIds = new Set(b.bearers.map((x) => `${x.kind}:${x.standard}:${x.band}:${x.label}`))
  return a.bearers.filter((x) => bIds.has(`${x.kind}:${x.standard}:${x.band}:${x.label}`))
}

export class PacePlanner {
  constructor(private solver: InteropSolver = interopSolver) {}

  buildPace(a: PlatformCommsFit, b: PlatformCommsFit, all: PlatformCommsFit[]): PacePlan {
    const interop = this.solver.canCommunicate(a, b, all)
    const warnings: string[] = []
    const entries: PaceEntry[] = []
    const used = new Set<string>()

    let bearers: CommsBearer[] = []
    if (interop.method === 'direct' || interop.method === 'voice_only') {
      bearers = rankBearers(sharedBetween(a, b))
    } else if (interop.method === 'via_gateway') {
      bearers = rankBearers(a.bearers.filter((x) => x.kind === 'datalink' || x.kind.startsWith('voice_')))
      warnings.push(`Gateway required: ${interop.gateway_id}`)
    } else {
      warnings.push('Incomplete PACE — no shared bearers between platforms')
    }

    for (const tier of TIERS) {
      const picked = pickForTier(tier, bearers, used)
      if (!picked) continue
      used.add(picked.id)
      const caveat =
        picked.pnt_dependent
          ? 'PNT-dependent — degrades under GNSS jamming'
          : picked.comsec_note
            ? 'COMSEC keying must be coordinated'
            : null
      entries.push({
        tier,
        bearer_label: picked.label,
        band: picked.band,
        rationale: tierRationale(tier, picked),
        caveat,
      })
      if (picked.pnt_dependent && tier === 'primary') {
        warnings.push('Primary is PNT-dependent — degrades under GNSS jamming')
      }
      if (picked.comsec_note && tier === 'primary') {
        warnings.push('Primary bearer requires common crypto keying')
      }
    }

    return {
      from_id: a.platform_id,
      to_id: b.platform_id,
      entries,
      gateway_required: interop.gateway_id ?? null,
      warnings: [...new Set(warnings)],
      complete: entries.length === 4,
    }
  }

  buildPackagePace(fits: PlatformCommsFit[]): { plan: PacePlan; exceptions: PacePlan[] } {
    if (fits.length < 2) {
      return {
        plan: {
          from_id: fits[0]?.platform_id ?? 'package',
          to_id: 'package',
          entries: [],
          gateway_required: null,
          warnings: ['Package requires at least 2 platforms'],
          complete: false,
        },
        exceptions: [],
      }
    }

    const commonLabels = fits[0]!.bearers.map((b) => b.label)
    let common = commonLabels.filter((label) =>
      fits.every((f) => f.bearers.some((b) => b.label === label)),
    )

    const syntheticA: PlatformCommsFit = {
      platform_id: 'package-a',
      bearers: fits[0]!.bearers.filter((b) => common.includes(b.label)),
      data_confidence: 'high',
      sources: [],
      boundary_note: null,
    }
    const syntheticB: PlatformCommsFit = {
      platform_id: 'package-b',
      bearers: fits[0]!.bearers.filter((b) => common.includes(b.label)),
      data_confidence: 'high',
      sources: [],
      boundary_note: null,
    }

    const plan = this.buildPace(syntheticA, syntheticB, fits)
    plan.from_id = 'package'
    plan.to_id = 'package'

    const exceptions: PacePlan[] = []
    for (let i = 0; i < fits.length; i++) {
      for (let j = i + 1; j < fits.length; j++) {
        const pair = this.buildPace(fits[i]!, fits[j]!, fits)
        if (!pair.complete || pair.gateway_required) {
          exceptions.push(pair)
        }
      }
    }

    return { plan, exceptions }
  }

  toCommsCard(plan: PacePlan): string {
    const lines: string[] = [
      'UNCLASSIFIED // EXERCISE — COMMS CARD',
      `FROM: ${plan.from_id}  TO: ${plan.to_id}`,
      plan.gateway_required ? `GATEWAY REQUIRED: ${plan.gateway_required}` : '',
      '---',
    ]
    for (const tier of TIERS) {
      const entry = plan.entries.find((e) => e.tier === tier)
      if (entry) {
        lines.push(
          `${tier.toUpperCase()}: ${entry.bearer_label} (${entry.band}) — ${entry.rationale}`,
        )
        if (entry.caveat) lines.push(`  CAVEAT: ${entry.caveat}`)
      } else {
        lines.push(`${tier.toUpperCase()}: — GAP —`)
      }
    }
    if (plan.warnings.length) {
      lines.push('---', 'WARNINGS:')
      plan.warnings.forEach((w) => lines.push(`  • ${w}`))
    }
    return lines.filter(Boolean).join('\n')
  }
}

export const pacePlanner = new PacePlanner()
