import { describe, expect, it } from 'vitest'
import { COST_ENTRIES, costById } from '@/lib/planner/cost-model'
import {
  DOF_PRESETS,
  compareReusable,
  engagementCostUsd,
  ladderOptions,
  ladderOrder,
  layersFromSettings,
  raidSchedule,
  runDaysOfFire,
  threatsWithLadder,
  type DofLayer,
} from '@/lib/planner/days-of-fire'
import {
  DOF_SWARM_ANALOGUES,
  DOF_SYSTEM_ANALOGUES,
  evidenceFromDefeatRows,
  pkBandsFor,
  swarmTableEvidence,
  type DefeatRowLike,
} from '@/lib/planner/days-of-fire-pk'
import { SWARM_DEFEAT_SYSTEMS } from '@/lib/planner/swarm-defeat-systems'

const THREAT = { loUsd: 10, hiUsd: 20 }

function layer(over: Partial<DofLayer> & { id: string }): DofLayer {
  return {
    label: over.id,
    costPerRoundUsd: { loUsd: 100, hiUsd: 200 },
    roundsPerEngagement: 1,
    pk: { lo: 1, hi: 1 },
    reusable: false,
    magazine: 0,
    resupplyPerDay: 0,
    maxPerNight: Infinity,
    ...over,
  }
}

const row = (
  platform_id: string,
  defeat_system_id: string,
  kinetic_pct: number | null,
  rf_jamming_pct: number | null,
  dew_pct: number | null,
  swarm_engagement_pct: number | null = null,
  is_immune = false,
): DefeatRowLike => ({ platform_id, defeat_system_id, kinetic_pct, rf_jamming_pct, dew_pct, swarm_engagement_pct, is_immune })

/** A small Defeat Matrix extract in the shape the query returns. */
const ROWS: DefeatRowLike[] = [
  row('shahed-136', 'dronegun-tactical', null, 30, null),
  row('shahed-136', 'edge-horizon', null, 68, null, 55),
  row('shahed-136', 'skynex', 82, null, null, 75),
  row('shahed-136', 'nasams-amraam-er', 84, null, null, 50),
  row('shahed-136', 'iron-beam', null, null, 85),
  row('geran-2', 'iron-beam', null, null, 75),
  row('kalibr-3m14', 'nasams-amraam-er', 78, null, null),
  row('kalibr-3m14', 'gepard-spaag', 70, null, null),
  row('fpv-rc', 'dronegun-tactical', null, 0, null, null, true),
  row('mq-9-reaper', 'iron-beam', null, null, 90), // not an analogue platform
  row('shahed-136', 'sa-15-gauntlet', 62, null, null), // not an analogue system
]
const EVIDENCE = [...evidenceFromDefeatRows(ROWS), ...swarmTableEvidence()]

describe('days of fire: the model', () => {
  it('is deterministic', () => {
    const input = {
      threatCostUsd: THREAT,
      raids: raidSchedule(12, 4, 20),
      layers: [
        layer({ id: 'a', pk: { lo: 0.4, hi: 0.8 }, magazine: 30, resupplyPerDay: 1 }),
        layer({ id: 'b', costPerRoundUsd: { loUsd: 1e6, hiUsd: 2e6 }, pk: { lo: 0.5, hi: 0.9 }, magazine: 8 }),
      ],
    }
    expect(runDaysOfFire(input)).toEqual(runDaysOfFire(input))
  })

  it('fires the cheapest engagement first, whatever order the layers arrive in', () => {
    const dear = layer({ id: 'dear', costPerRoundUsd: { loUsd: 1_000_000, hiUsd: 1_500_000 }, magazine: 10 })
    const cheap = layer({ id: 'cheap', costPerRoundUsd: { loUsd: 20_000, hiUsd: 35_000 }, magazine: 10 })
    const res = runDaysOfFire({ threatCostUsd: THREAT, raids: [4], layers: [dear, cheap] })
    expect(res.layers.map((l) => l.id)).toEqual(['cheap', 'dear'])
    // Pk 1 in the cheap layer: the dear magazine is never touched.
    expect(res.low.roundsFired).toEqual({ cheap: 4, dear: 0 })
  })

  it('prices a gun burst as rounds times cost per round, and orders on that', () => {
    const gun = layer({ id: 'gun', costPerRoundUsd: { loUsd: 300, hiUsd: 1_200 }, roundsPerEngagement: 100 })
    const rocket = layer({ id: 'rocket', costPerRoundUsd: { loUsd: 22_000, hiUsd: 35_000 } })
    expect(engagementCostUsd(gun)).toEqual({ loUsd: 30_000, hiUsd: 120_000 })
    expect(ladderOrder([gun, rocket]).map((l) => l.id)).toEqual(['rocket', 'gun'])
  })

  it('counts rounds down, runs dry on the first night it cannot cover the raid, and leaks from then', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: [4, 4, 4, 4],
      layers: [layer({ id: 'x', magazine: 10 })],
    })
    const left = res.low.nights.map((n) => n.layers[0].roundsLeft)
    expect(left).toEqual([6, 2, 0, 0])
    expect(res.low.nights.map((n) => n.leakers)).toEqual([0, 0, 2, 4])
    expect(res.low.dryDay.x).toBe(3)
    expect(res.low.firstDry).toEqual({ day: 3, layerId: 'x' })
    expect(res.low.firstLeakerDay).toBe(3)
    expect(res.low.allDryDay).toBe(3)
    expect(res.totals.leakers).toEqual({ lo: 6, hi: 6 })
  })

  it('does not call a magazine dry when resupply refills it before each raid', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: [4, 4, 4, 4, 4],
      layers: [layer({ id: 'x', magazine: 4, resupplyPerDay: 4 })],
    })
    expect(res.low.dryDay.x).toBeNull()
    expect(res.low.firstLeakerDay).toBeNull()
    expect(res.low.nights.every((n) => n.layers[0].empty)).toBe(true)
  })

  it('passes survivors up the ladder, so expensive rounds go only on what the cheap layer misses', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: [10],
      layers: [
        layer({ id: 'cheap', costPerRoundUsd: { loUsd: 1, hiUsd: 1 }, pk: { lo: 0.5, hi: 0.8 }, magazine: 100 }),
        layer({ id: 'dear', costPerRoundUsd: { loUsd: 1000, hiUsd: 1000 }, pk: { lo: 1, hi: 1 }, magazine: 100 }),
      ],
    })
    expect(res.low.nights[0].layers[1].reached).toBeCloseTo(5, 9)
    expect(res.high.nights[0].layers[1].reached).toBeCloseTo(2, 9)
    expect(res.low.roundsFired.dear).toBeCloseTo(5, 9)
    expect(res.high.roundsFired.dear).toBeCloseTo(2, 9)
  })

  it('reports leakers and cost as bands, low end from the high-Pk run', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: [10, 10],
      layers: [layer({ id: 'x', pk: { lo: 0.5, hi: 0.9 }, magazine: 100 })],
    })
    expect(res.totals.leakers.lo).toBeCloseTo(2, 9) // 20 x 0.1
    expect(res.totals.leakers.hi).toBeCloseTo(10, 9) // 20 x 0.5
    expect(res.totals.costUsd).toEqual({ lo: 2_000, hi: 4_000 })
    for (const d of res.days) {
      expect(d.leakers.lo).toBeLessThanOrEqual(d.leakers.hi)
      expect(d.cumulativeCostUsd.lo).toBeLessThanOrEqual(d.cumulativeCostUsd.hi)
    }
  })

  it('computes exchange as defence spend over attacker spend, widest reading each way', () => {
    const res = runDaysOfFire({ threatCostUsd: THREAT, raids: [10], layers: [layer({ id: 'x', magazine: 10 })] })
    // Spend 1,000 to 2,000; attacker 100 to 200.
    expect(res.totals.exchange.lo).toBeCloseTo(5, 9)
    expect(res.totals.exchange.hi).toBeCloseTo(20, 9)
    expect(res.totals.attackerCostUsd).toEqual({ lo: 100, hi: 200 })
  })

  it('treats reusable effects as having no magazine, only a nightly limit', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: raidSchedule(30, 30, 10),
      layers: [layer({ id: 'rf', reusable: true, costPerRoundUsd: { loUsd: 1, hiUsd: 20 }, pk: { lo: 1, hi: 1 }, maxPerNight: 20 })],
    })
    expect(res.low.dryDay).toEqual({})
    expect(res.low.nights.every((n) => n.layers[0].engaged === 20 && n.leakers === 10)).toBe(true)
    expect(res.totals.costUsd).toEqual({ lo: 200, hi: 4_000 })
  })

  it('applies a nightly limit to an expendable layer without calling it dry', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: [10, 10],
      layers: [layer({ id: 'x', magazine: 100, maxPerNight: 6 })],
    })
    expect(res.low.nights.map((n) => n.leakers)).toEqual([4, 4])
    expect(res.low.dryDay.x).toBeNull()
  })

  it('leaves off any layer with no Pk above zero, and says why', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: [5],
      layers: [layer({ id: 'dud', pk: { lo: 0, hi: 0 }, magazine: 5 }), layer({ id: 'ok', magazine: 5 })],
    })
    expect(res.layers.map((l) => l.id)).toEqual(['ok'])
    expect(res.excluded.map((x) => x.id)).toEqual(['dud'])
  })

  it('sanitises bad input rather than producing NaN', () => {
    const res = runDaysOfFire({
      threatCostUsd: THREAT,
      raids: [Number.NaN, -3, 4],
      layers: [layer({ id: 'x', magazine: Number.NaN, resupplyPerDay: -2, roundsPerEngagement: 0, maxPerNight: Number.NaN })],
    })
    expect(res.totals.threats).toBe(4)
    expect(Number.isFinite(res.totals.leakers.hi)).toBe(true)
    expect(res.totals.leakers.hi).toBe(4)
  })

  it('builds a raid schedule from an opening night and a steady raid', () => {
    expect(raidSchedule(40, 12, 4)).toEqual([40, 12, 12, 12])
    expect(raidSchedule(5, 5, 0)).toEqual([5])
    expect(raidSchedule(5, 5, 1_000)).toHaveLength(90)
  })
})

describe('days of fire: Pk from data, not defaults', () => {
  it('reads the column that matches the effect, and the swarm-condition column', () => {
    const shahed = pkBandsFor('shahed-136', evidenceFromDefeatRows(ROWS))
    expect(shahed.get('rf-jammer')).toMatchObject({ lo: 0.3, hi: 0.68 })
    expect(shahed.get('gun-35mm')).toMatchObject({ lo: 0.75, hi: 0.82 })
    expect(shahed.get('amraam-nasams')).toMatchObject({ lo: 0.5, hi: 0.84 })
    // Geran-2 counts as Shahed-136.
    expect(shahed.get('hel-laser')).toMatchObject({ lo: 0.75, hi: 0.85 })
  })

  it('ignores platforms and systems with no analogue', () => {
    const ev = evidenceFromDefeatRows(ROWS)
    expect(ev.some((e) => e.platformId === 'mq-9-reaper')).toBe(false)
    expect(ev.some((e) => e.systemId === 'sa-15-gauntlet')).toBe(false)
  })

  it('records an immune pairing as Pk 0, so it cannot join the ladder', () => {
    const fpv = evidenceFromDefeatRows(ROWS).filter((e) => e.threatId === 'fpv-attack')
    expect(fpv).toHaveLength(1)
    expect(fpv[0].pk).toBe(0)
    expect(ladderOptions('fpv-attack', EVIDENCE)).toEqual([])
  })

  it('uses the swarm table only for the Shahed class it was written for', () => {
    const sw = swarmTableEvidence()
    expect(new Set(sw.map((e) => e.threatId))).toEqual(new Set(['shahed-136']))
    for (const e of sw) {
      const sys = SWARM_DEFEAT_SYSTEMS.find((s) => s.id === e.systemId)
      expect(sys, e.systemId).toBeDefined()
      expect(e.pk).toBe(sys!.pk)
    }
  })

  it('maps only to effectors that exist in the cost table', () => {
    const effectorIds = new Set(COST_ENTRIES.filter((c) => c.side === 'effector').map((c) => c.id))
    for (const id of [...Object.keys(DOF_SYSTEM_ANALOGUES), ...Object.keys(DOF_SWARM_ANALOGUES)]) {
      expect(effectorIds.has(id), id).toBe(true)
    }
    for (const ids of Object.values(DOF_SWARM_ANALOGUES)) {
      for (const id of ids) expect(SWARM_DEFEAT_SYSTEMS.some((s) => s.id === id), id).toBe(true)
    }
  })

  it('offers a ladder in the cost-exchange ranking order, and only where Pk is on record', () => {
    const opts = ladderOptions('shahed-136', EVIDENCE)
    const ids = opts.map((o) => o.effector.id)
    expect(ids[0]).toBe('rf-jammer')
    expect(ids).not.toContain('apkws') // no APKWS row in this extract
    const costs = opts.map((o) => o.effector.perEngagementUsd.loUsd)
    expect([...costs].sort((a, b) => a - b)).toEqual(costs)
    expect(threatsWithLadder(EVIDENCE).map((t) => t.id)).toEqual(['shahed-136', 'kalibr-3m14'])
  })
})

describe('days of fire: reusable layer comparison and presets', () => {
  it('compares with and without the reusable layer, and the reusable layer never makes things worse', () => {
    const opts = ladderOptions('shahed-136', EVIDENCE)
    for (const p of DOF_PRESETS) {
      const raids = raidSchedule(p.openingNight, p.eachNight, p.days)
      const cmp = compareReusable(opts, p.settings, raids, costById(p.threatId)!.perEngagementUsd)!
      expect(cmp.kineticOnly.layers.every((l) => !l.reusable)).toBe(true)
      expect(cmp.withReusable.layers.some((l) => l.reusable)).toBe(true)
      expect(cmp.withReusable.totals.leakers.hi).toBeLessThanOrEqual(cmp.kineticOnly.totals.leakers.hi + 1e-9)
      expect(cmp.withReusable.totals.costUsd.lo).toBeLessThanOrEqual(cmp.kineticOnly.totals.costUsd.lo + 1e-9)
    }
  })

  it('adds the reusable layers when none is switched on, so the question can still be asked', () => {
    const opts = ladderOptions('shahed-136', EVIDENCE)
    const settings = { 'amraam-nasams': { on: true, magazine: 12, resupplyPerDay: 0, maxPerNight: null, roundsPerEngagement: 1 } }
    const cmp = compareReusable(opts, settings, [10, 10], costById('shahed-136')!.perEngagementUsd)!
    expect(cmp.added).toBe(true)
    expect(cmp.reusableIds).toEqual(expect.arrayContaining(['rf-jammer', 'hel-laser']))
  })

  it('keeps presets on real cost-table ids, with plain copy and the advertised raid size', () => {
    for (const p of DOF_PRESETS) {
      expect(costById(p.threatId)?.side).toBe('threat')
      for (const id of Object.keys(p.settings)) expect(costById(id)?.side, id).toBe('effector')
      expect(`${p.label} ${p.note}`).not.toMatch(/—/)
      expect(p.note).toMatch(/Illustrative/)
    }
    const gulf = DOF_PRESETS.find((p) => p.id === 'gulf-scale')!
    expect(raidSchedule(gulf.openingNight, gulf.eachNight, gulf.days).reduce((a, b) => a + b, 0)).toBe(1_500)
  })

  it('switches layers on and off through settings only', () => {
    const opts = ladderOptions('shahed-136', EVIDENCE)
    const p = DOF_PRESETS[0]
    const on = layersFromSettings(opts, p.settings).map((l) => l.id)
    for (const id of on) expect(p.settings[id]?.on).toBe(true)
  })
})
