/**
 * Days of fire: where each layer's Pk comes from.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 *
 * The cost table (`cost-model.ts`) names effectors by class ("RF jammer",
 * "AIM-120 AMRAAM (NASAMS)"). The Defeat Matrix records Pk per named system
 * against a named platform. This file is the join between the two, and it
 * holds no numbers of its own: every Pk used by the days-of-fire model is read
 * from a Defeat Matrix row (`defeat_effectiveness`) or from the swarm effector
 * table (`swarm-defeat-systems.ts`).
 *
 * A layer's Pk is a band, lowest to highest value on record across its
 * analogue systems. Where the Defeat Matrix records a swarm-condition Pk it
 * joins the band, because a nightly raid is a swarm condition. A layer with no
 * record against the threat is left off the ladder rather than given a
 * default: "no data" is not "Pk 0.65".
 */

import { SWARM_DEFEAT_SYSTEMS } from '@/lib/planner/swarm-defeat-systems'

export type PkColumn = 'kinetic_pct' | 'rf_jamming_pct' | 'dew_pct'

export interface PkEvidence {
  /** Cost-table threat id. */
  threatId: string
  /** Cost-table effector id. */
  effectorId: string
  /** 0 to 1. */
  pk: number
  source: 'defeat-matrix' | 'swarm-table'
  /** Defeat Matrix or swarm-table system id. */
  systemId: string
  systemLabel: string
  /** Defeat Matrix platform id the row was recorded against; '' for the swarm table. */
  platformId: string
  /** Single engagement, or the Defeat Matrix swarm-condition column. */
  condition: 'single' | 'swarm'
}

/**
 * Cost-table threats and the Defeat Matrix platforms that stand for them.
 * Geran-2 is the Russian-built Shahed-136; Lancet-3M is the later Lancet.
 */
export const DOF_PLATFORM_ANALOGUES: Record<string, readonly string[]> = {
  'shahed-136': ['shahed-136', 'geran-2'],
  'lancet-3': ['lancet-3', 'lancet-3m'],
  'fpv-attack': ['fpv-rc'],
  'kalibr-3m14': ['kalibr-3m14'],
}

/**
 * Cost-table effectors and the Defeat Matrix systems that stand for them, with
 * the Pk column that matches the effect. Coyote Block 2 has no Defeat Matrix
 * row (the matrix holds Block 3 only), so it relies on the swarm table.
 */
export const DOF_SYSTEM_ANALOGUES: Record<string, { ids: readonly string[]; column: PkColumn }> = {
  'rf-jammer': { ids: ['dronegun-tactical', 'silent-archer', 'edge-horizon'], column: 'rf_jamming_pct' },
  hpm: { ids: ['leonidas-hpm', 'thor-hpm'], column: 'dew_pct' },
  'hel-laser': { ids: ['iron-beam', 'dragonfire-uk', 'helios-60kw', 'skyguard-laser'], column: 'dew_pct' },
  'gun-35mm': { ids: ['gepard-cuas', 'gepard-spaag', 'skynex'], column: 'kinetic_pct' },
  apkws: { ids: ['apkws-vampire-launcher', 'bullfrog-apkws'], column: 'kinetic_pct' },
  'coyote-b2': { ids: [], column: 'kinetic_pct' },
  'amraam-nasams': { ids: ['nasams-amraam-er'], column: 'kinetic_pct' },
  'sm-2': { ids: ['sm-2-aegis-cuas', 'gbad-cea-sm2-aus'], column: 'kinetic_pct' },
  'sm-6': { ids: ['sm-6-aegis-cuas'], column: 'kinetic_pct' },
  'pac3-mse': { ids: ['patriot-pac-3'], column: 'kinetic_pct' },
}

/**
 * Swarm-table systems per effector. The swarm table's profiles are written
 * for Shahed-class one-way attack raids (its presets are the Odessa corridor
 * and a North Queensland belt), so it is used for Shahed-136 only.
 */
export const DOF_SWARM_ANALOGUES: Record<string, readonly string[]> = {
  'rf-jammer': ['dronegun-mk4', 'pulsar-v'],
  hpm: ['epirus-leonidas'],
  'hel-laser': ['iron-beam', 'dragonfire'],
  'gun-35mm': ['gepard', 'skynex'],
  'coyote-b2': ['coyote-b2'],
  'amraam-nasams': ['nasams'],
  'sm-2': ['sm-2-aegis', 'gbad-cea-sm2'],
  'pac3-mse': ['patriot-pac3'],
}

export const DOF_SWARM_TABLE_THREATS: readonly string[] = ['shahed-136']

/** The subset of a Defeat Matrix row this file reads. */
export interface DefeatRowLike {
  platform_id: string
  defeat_system_id: string
  kinetic_pct: number | null
  rf_jamming_pct: number | null
  dew_pct: number | null
  swarm_engagement_pct?: number | null
  is_immune?: boolean | null
  defeat_system?: { name?: string | null } | null
}

function threatForPlatform(platformId: string): string | null {
  for (const [threatId, platforms] of Object.entries(DOF_PLATFORM_ANALOGUES)) {
    if (platforms.includes(platformId)) return threatId
  }
  return null
}

/** Map Defeat Matrix rows onto cost-table threat and effector pairs. */
export function evidenceFromDefeatRows(rows: readonly DefeatRowLike[]): PkEvidence[] {
  const out: PkEvidence[] = []
  for (const row of rows) {
    const threatId = threatForPlatform(row.platform_id)
    if (!threatId) continue
    for (const [effectorId, analogue] of Object.entries(DOF_SYSTEM_ANALOGUES)) {
      if (!analogue.ids.includes(row.defeat_system_id)) continue
      const base = {
        threatId,
        effectorId,
        source: 'defeat-matrix' as const,
        systemId: row.defeat_system_id,
        systemLabel: row.defeat_system?.name ?? row.defeat_system_id,
        platformId: row.platform_id,
      }
      if (row.is_immune) {
        out.push({ ...base, pk: 0, condition: 'single' })
        continue
      }
      const single = row[analogue.column]
      if (single != null) out.push({ ...base, pk: clampPk(single / 100), condition: 'single' })
      const swarm = row.swarm_engagement_pct
      if (swarm != null) out.push({ ...base, pk: clampPk(swarm / 100), condition: 'swarm' })
    }
  }
  return out
}

/** Swarm-table rows for the threats the table was written for. */
export function swarmTableEvidence(): PkEvidence[] {
  const out: PkEvidence[] = []
  for (const threatId of DOF_SWARM_TABLE_THREATS) {
    for (const [effectorId, ids] of Object.entries(DOF_SWARM_ANALOGUES)) {
      for (const id of ids) {
        const sys = SWARM_DEFEAT_SYSTEMS.find((s) => s.id === id)
        if (!sys) continue
        out.push({
          threatId,
          effectorId,
          pk: clampPk(sys.pk),
          source: 'swarm-table',
          systemId: sys.id,
          systemLabel: sys.name,
          platformId: '',
          condition: 'single',
        })
      }
    }
  }
  return out
}

function clampPk(p: number): number {
  if (!Number.isFinite(p)) return 0
  return Math.min(1, Math.max(0, p))
}

export interface PkBand {
  lo: number
  hi: number
  records: PkEvidence[]
}

/** Lowest and highest Pk on record for each effector against one threat. */
export function pkBandsFor(threatId: string, evidence: readonly PkEvidence[]): Map<string, PkBand> {
  const out = new Map<string, PkBand>()
  for (const e of evidence) {
    if (e.threatId !== threatId) continue
    const cur = out.get(e.effectorId)
    if (!cur) out.set(e.effectorId, { lo: e.pk, hi: e.pk, records: [e] })
    else {
      cur.lo = Math.min(cur.lo, e.pk)
      cur.hi = Math.max(cur.hi, e.pk)
      cur.records.push(e)
    }
  }
  return out
}

/** One line per record, for a tooltip. */
export function describeEvidence(records: readonly PkEvidence[]): string {
  return records
    .map((r) => {
      const where = r.source === 'defeat-matrix' ? `Defeat Matrix, vs ${r.platformId}` : 'swarm table'
      const cond = r.condition === 'swarm' ? ', swarm condition' : ''
      return `${r.systemLabel}: ${r.pk.toFixed(2)} (${where}${cond})`
    })
    .join('\n')
}
