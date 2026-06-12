import type { BuildingMaterialClass } from '@/lib/buildings/types'

/** Estimated penetration loss at 2.4 GHz — not site survey. */
export const MATERIAL_PENETRATION_DB: Record<BuildingMaterialClass, number> = {
  concrete: 12,
  brick: 8,
  glass: 4,
  steel: 18,
  wood: 5,
}

export function penetrationLossDb(material: BuildingMaterialClass, freq_hz: number): number {
  const base = MATERIAL_PENETRATION_DB[material]
  const scale = freq_hz > 5e9 ? 1.25 : freq_hz > 2e9 ? 1.1 : 1
  return Math.round(base * scale * 10) / 10
}
