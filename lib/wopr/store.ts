import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createDefaultWorldState } from '@/lib/wopr/engine'
import type { WoprScenario } from '@/lib/wopr/types'

const globalForWopr = globalThis as typeof globalThis & {
  __woprScenarioMemory?: Map<string, WoprScenario>
}

const memory = globalForWopr.__woprScenarioMemory ?? new Map<string, WoprScenario>()
if (!globalForWopr.__woprScenarioMemory) {
  globalForWopr.__woprScenarioMemory = memory
}


function saveToMemory(scenario: WoprScenario): void {
  memory.set(scenario.id, scenario)
}

/** Merge DB rows with in-memory scenarios for a tenant (memory overlays DB). */
export function mergeScenariosForTenant(
  dbScenarios: WoprScenario[],
  tenantId: string,
  memoryMap: Map<string, WoprScenario> = memory,
): WoprScenario[] {
  const byId = new Map<string, WoprScenario>()
  for (const s of dbScenarios) {
    if (s.tenant_id === tenantId) byId.set(s.id, s)
  }
  for (const s of memoryMap.values()) {
    if (s.tenant_id === tenantId) byId.set(s.id, s)
  }
  return [...byId.values()].sort((a, b) => b.elapsed_min - a.elapsed_min)
}

/** Test helper — clears the in-memory fallback store. */
export function clearMemoryStoreForTests(): void {
  memory.clear()
}

export async function listScenarios(tenantId: string): Promise<WoprScenario[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('wopr_scenarios')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
    const dbScenarios = (data ?? []).map(rowToScenario)
    for (const s of dbScenarios) saveToMemory(s)
    return mergeScenariosForTenant(dbScenarios, tenantId)
  } catch {
    return mergeScenariosForTenant([], tenantId)
  }
}

export async function getScenario(id: string, tenantId: string): Promise<WoprScenario | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('wopr_scenarios')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (data) {
      const scenario = rowToScenario(data)
      saveToMemory(scenario)
      return scenario
    }
  } catch {
    const m = memory.get(id)
    if (m && m.tenant_id === tenantId) return m
    return null
  }

  const m = memory.get(id)
  if (m && m.tenant_id === tenantId) return m
  return null
}

export async function createScenario(
  tenantId: string,
  userId: string,
  name: string,
  classification: string,
  worldState = createDefaultWorldState(),
): Promise<WoprScenario> {
  const world = worldState
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('wopr_scenarios')
      .insert({
        tenant_id: tenantId,
        name,
        classification,
        world_state: world,
        created_by: userId,
      })
      .select('*')
      .single()
    if (error) throw error
    const scenario = rowToScenario(data)
    saveToMemory(scenario)
    return scenario
  } catch {
    const id = crypto.randomUUID()
    const scenario: WoprScenario = {
      id,
      tenant_id: tenantId,
      name,
      classification,
      world_state: world,
      elapsed_min: 0,
      status: 'draft',
    }
    saveToMemory(scenario)
    return scenario
  }
}

export async function saveScenario(scenario: WoprScenario): Promise<void> {
  saveToMemory(scenario)
  try {
    const supabase = await createClient()
    await supabase
      .from('wopr_scenarios')
      .update({
        world_state: scenario.world_state,
        elapsed_min: scenario.elapsed_min,
        status: scenario.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scenario.id)
      .eq('tenant_id', scenario.tenant_id)
  } catch {
    // Memory already updated — DB write failed silently for fallback mode
  }
}

function rowToScenario(row: Record<string, unknown>): WoprScenario {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    name: row.name as string,
    classification: row.classification as string,
    world_state: row.world_state as WoprScenario['world_state'],
    elapsed_min: Number(row.elapsed_min ?? 0),
    status: row.status as WoprScenario['status'],
  }
}
