import { createClient } from '@/lib/supabase/server'
import { createDefaultWorldState } from '@/lib/wopr/engine'
import type { WoprScenario } from '@/lib/wopr/types'

const memory = new Map<string, WoprScenario>()

export async function listScenarios(tenantId: string): Promise<WoprScenario[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('wopr_scenarios')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
    return (data ?? []).map(rowToScenario)
  } catch {
    return [...memory.values()].filter((s) => s.tenant_id === tenantId)
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
    if (data) return rowToScenario(data)
  } catch {
    const m = memory.get(id)
    if (m && m.tenant_id === tenantId) return m
  }
  return null
}

export async function createScenario(
  tenantId: string,
  userId: string,
  name: string,
  classification: string,
): Promise<WoprScenario> {
  const world = createDefaultWorldState()
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
    return rowToScenario(data)
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
    memory.set(id, scenario)
    return scenario
  }
}

export async function saveScenario(scenario: WoprScenario): Promise<void> {
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
    memory.set(scenario.id, scenario)
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
