import { FORCE_EFFECT_LABEL, FORCE_EFFECTS, type EffectCell, type ForceEffect, type NationCompare, type NationForce } from '@/lib/force/types'

function namesFor(force: NationForce, effect: ForceEffect): string[] {
  return force.effects.find((e) => e.effect === effect)?.names ?? []
}

function countFor(force: NationForce, effect: ForceEffect): number {
  return force.effects.find((e) => e.effect === effect)?.count ?? 0
}

function cellCopy(
  effect: ForceEffect,
  a: NationForce,
  b: NationForce,
  aCount: number,
  bCount: number,
): { so_what: string; gap: string } {
  const aN = a.nation.shortName
  const bN = b.nation.shortName
  if (aCount === 0 && bCount === 0) {
    return {
      so_what: `Neither catalog lists a ${FORCE_EFFECT_LABEL[effect]} type. Do not invent the capability.`,
      gap: 'Both sides — effect not represented in this OSINT set.',
    }
  }
  if (aCount === 0) {
    return {
      so_what: `${aN} has no catalogued ${FORCE_EFFECT_LABEL[effect]} type. ${bN} holds the effect in this set.`,
      gap: `${aN} — cannot generate this effect from catalogued types.`,
    }
  }
  if (bCount === 0) {
    return {
      so_what: `${bN} has no catalogued ${FORCE_EFFECT_LABEL[effect]} type. ${aN} holds the effect in this set.`,
      gap: `${bN} — cannot generate this effect from catalogued types.`,
    }
  }
  if (effect === 'finish' || effect === 'sea_control' || effect === 'shield') {
    const heavier = aCount > bCount ? bN : aCount < bCount ? aN : null
    return {
      so_what:
        aCount === bCount
          ? `Type counts are close. Discriminate on quality, basing, and munitions — not hull count.`
          : `${aN} ${aCount} vs ${bN} ${bCount} catalogued types. Mass favours the larger list; it is not a campaign result.`,
      gap: heavier
        ? `${heavier} — fewer types in this effect. Ask whether munitions and basing close the gap.`
        : 'No type-count gap. Look at sensors, tankers, and AD density instead.',
    }
  }
  return {
    so_what: `${aN} ${aCount} vs ${bN} ${bCount} types. The side that keeps this node alive (AEW, tanker, C2) usually keeps the fight.`,
    gap:
      aCount < bCount
        ? `${aN} — thinner ${FORCE_EFFECT_LABEL[effect]}. Protect the few nodes you have.`
        : bCount < aCount
          ? `${bN} — thinner ${FORCE_EFFECT_LABEL[effect]}.`
          : 'Parity in type count. Discriminate on persistence and EMCON.',
  }
}

export function buildNationCompare(a: NationForce, b: NationForce): NationCompare {
  const cells: EffectCell[] = FORCE_EFFECTS.map((effect) => {
    const a_count = countFor(a, effect)
    const b_count = countFor(b, effect)
    const a_names = namesFor(a, effect).slice(0, 4)
    const b_names = namesFor(b, effect).slice(0, 4)
    const { so_what, gap } = cellCopy(effect, a, b, a_count, b_count)
    const confidence =
      a.platforms.some((p) => p.nato_confidence === 'Assessed') &&
      b.platforms.some((p) => p.nato_confidence === 'Assessed')
        ? 'Assessed'
        : 'Estimated'
    return {
      effect,
      label: FORCE_EFFECT_LABEL[effect],
      a_count,
      b_count,
      a_names,
      b_names,
      so_what,
      gap,
      confidence: confidence as EffectCell['confidence'],
    }
  })

  return {
    a,
    b,
    cells,
    headline: `${a.nation.shortName} vs ${b.nation.shortName} — effect comparison, not a winner.`,
    caveat:
      'Hull and type counts are OSINT catalog depth, not order-of-battle strength. Munitions, crew, basing, and classified sensors are not in this set. Do not brief a campaign winner from this matrix.',
  }
}
