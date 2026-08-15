import { classifyEffect, toNatoConfidence } from '@/lib/force/effects'
import { countryMatchesNation, getForceNation } from '@/lib/force/nations'
import type {
  BmiCommsRow,
  BmiPlatformRow,
  BmiSensorRow,
  DomainTally,
  EffectTally,
  ForceDomain,
  ForceEffect,
  ForceNation,
  ForcePlatform,
  LinkedCuas,
  LinkedUas,
  NationForce,
} from '@/lib/force/types'
import { FORCE_EFFECTS } from '@/lib/force/types'

export function enrichPlatform(
  row: BmiPlatformRow,
  comms: BmiCommsRow[],
  sensors: BmiSensorRow[],
  uas: LinkedUas[],
  cuas: LinkedCuas[],
): ForcePlatform {
  return {
    ...row,
    effect: classifyEffect(row.role, row.designation, row.short_name, row.domain),
    nato_confidence: toNatoConfidence(row.data_confidence),
    comms,
    sensors,
    linked_uas: uas,
    linked_cuas: cuas,
  }
}

export function assembleNationForce(
  nation: ForceNation,
  platforms: ForcePlatform[],
): NationForce {
  const catalog = platforms.filter((p) => p.is_catalog)
  const domains: ForceDomain[] = ['air', 'ground', 'maritime']
  const domain: DomainTally[] = domains.map((d) => {
    const rows = catalog.filter((p) => p.domain === d)
    return {
      domain: d,
      count: rows.length,
      high: rows.filter((p) => p.data_confidence === 'high').length,
      medium: rows.filter((p) => p.data_confidence === 'medium').length,
      estimated: rows.filter((p) => p.data_confidence === 'estimated' || p.data_confidence === 'classified').length,
    }
  })
  const effects: EffectTally[] = FORCE_EFFECTS.map((effect) => {
    const rows = catalog.filter((p) => p.effect === effect)
    return {
      effect,
      count: rows.length,
      names: rows.map((p) => p.short_name || p.designation),
    }
  })
  const uasById = new Map<string, LinkedUas>()
  for (const p of catalog) {
    for (const u of p.linked_uas) uasById.set(u.id, u)
  }
  return {
    nation,
    platforms: catalog,
    domain,
    effects,
    comms_count: catalog.reduce((n, p) => n + p.comms.length, 0),
    sensors_count: catalog.reduce((n, p) => n + p.sensors.length, 0),
    linked_uas: [...uasById.values()],
    linked_cuas: [],
    catalog_count: catalog.length,
  }
}

export function matchUasForNation(
  code: string,
  platforms: Array<{ id: string; name: string; country_of_origin?: string | null; category?: string | null }>,
): LinkedUas[] {
  return platforms
    .filter((p) => countryMatchesNation(p.country_of_origin, code))
    .map((p) => ({ id: p.id, name: p.name, category: p.category ?? null }))
}

export function matchCuasForNation(
  code: string,
  systems: Array<{ id: string; name: string; country?: string | null; country_of_origin?: string | null }>,
): LinkedCuas[] {
  return systems
    .filter((s) => countryMatchesNation(s.country ?? s.country_of_origin, code))
    .map((s) => ({ id: s.id, name: s.name }))
}

export function requireNation(code: string): ForceNation {
  const nation = getForceNation(code)
  if (!nation) throw new Error(`Unknown force nation: ${code}`)
  return nation
}

export function tallyEffect(force: NationForce, effect: ForceEffect): EffectTally {
  return force.effects.find((e) => e.effect === effect) ?? { effect, count: 0, names: [] }
}
