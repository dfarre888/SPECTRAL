import { createClient } from '@/lib/supabase/server'
import type { BuildingFootprint, BuildingMaterialClass } from '@/lib/buildings/types'

const memoryStore = new Map<string, BuildingFootprint[]>()

function assertTenantPartition(buildings: BuildingFootprint[], tenantId: string): BuildingFootprint[] {
  return buildings.filter((b) => {
    if (b.tenantId !== tenantId) {
      console.warn(`[buildings] Dropped footprint ${b.id} — tenant mismatch (expected ${tenantId})`)
      return false
    }
    return true
  })
}

export async function loadBuildingsForTenant(tenantId: string): Promise<BuildingFootprint[]> {
  if (!tenantId) return []

  if (memoryStore.has(tenantId)) {
    return assertTenantPartition(memoryStore.get(tenantId)!, tenantId)
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('building_footprints')
      .select('*')
      .eq('tenant_id', tenantId)

    const buildings: BuildingFootprint[] = assertTenantPartition(
      (data ?? [])
        .filter((row) => row.tenant_id === tenantId)
        .map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          source: row.source,
          polygon: (row.geometry as { coordinates?: number[][] })?.coordinates?.map((c) => ({
            lon: c[0],
            lat: c[1],
          })) ?? [],
          height_m: row.height_m,
          material_class: row.material_class as BuildingMaterialClass,
          classification: row.classification,
        })),
      tenantId,
    )

    memoryStore.set(tenantId, buildings)
    return buildings
  } catch {
    return assertTenantPartition(memoryStore.get(tenantId) ?? [], tenantId)
  }
}

export function cacheBuildingsForTenant(tenantId: string, buildings: BuildingFootprint[]): void {
  memoryStore.set(tenantId, assertTenantPartition(buildings, tenantId))
}

/** Invalidate cached footprints after ingest or tenant switch — prevents cross-tenant bleed. */
export function invalidateBuildingCache(tenantId?: string): void {
  if (tenantId) memoryStore.delete(tenantId)
  else memoryStore.clear()
}
