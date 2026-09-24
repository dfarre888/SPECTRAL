import type { AntiDroneSystem, DefeatEffectiveness } from '@/lib/types'

/** Same system, different catalogue rows: compare names without any bracketed qualifier. */
function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Collapse catalogue rows that describe the same system (two imports added
 * "MBDA DragonFire" and "Anduril Anvil" twice). The row with the most
 * findings is kept; findings recorded against the other row move onto it
 * unless the kept row already has a finding for that platform. Nothing is
 * deleted from the database; this only shapes what the matrix shows.
 */
export function dedupeSystems(
  systems: AntiDroneSystem[],
  effectiveness: DefeatEffectiveness[],
): { systems: AntiDroneSystem[]; effectiveness: DefeatEffectiveness[] } {
  const findings = new Map<string, number>()
  for (const e of effectiveness) findings.set(e.defeat_system_id, (findings.get(e.defeat_system_id) ?? 0) + 1)

  const groups = new Map<string, AntiDroneSystem[]>()
  for (const s of systems) {
    const key = nameKey(s.name)
    groups.set(key, [...(groups.get(key) ?? []), s])
  }

  const remap = new Map<string, string>()
  const kept: AntiDroneSystem[] = []
  for (const group of groups.values()) {
    const ranked = [...group].sort(
      (a, b) => (findings.get(b.id) ?? 0) - (findings.get(a.id) ?? 0) || a.id.localeCompare(b.id),
    )
    kept.push(ranked[0])
    for (const dup of ranked.slice(1)) remap.set(dup.id, ranked[0].id)
  }
  if (remap.size === 0) return { systems, effectiveness }

  const taken = new Set(
    effectiveness.filter((e) => !remap.has(e.defeat_system_id)).map((e) => `${e.platform_id}|${e.defeat_system_id}`),
  )
  const merged: DefeatEffectiveness[] = []
  for (const e of effectiveness) {
    const target = remap.get(e.defeat_system_id)
    if (!target) {
      merged.push(e)
      continue
    }
    const key = `${e.platform_id}|${target}`
    if (taken.has(key)) continue
    taken.add(key)
    merged.push({ ...e, defeat_system_id: target })
  }
  const order = new Map(systems.map((s, i) => [s.id, i]))
  kept.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return { systems: kept, effectiveness: merged }
}
