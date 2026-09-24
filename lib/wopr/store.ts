import 'server-only'
import { getDemoTenantId } from '@/lib/demo'
import { createClient } from '@/lib/supabase/server'
import { planBranch, type BranchPlan } from '@/lib/wopr/branch'
import {
  demoWoprScenarios,
  demoWoprTicks,
  isDemoScenarioId,
  isPlaceholderScenarioName,
} from '@/lib/wopr/demo-scenarios'
import { createDefaultWorldState } from '@/lib/wopr/engine'
import type { ScenarioStatus, TickRecord, TickResult, WorldState, WoprScenario } from '@/lib/wopr/types'

/**
 * Scenario and tick-history store.
 *
 * Writes go to Supabase when the tables and columns exist and always to an
 * in-process memory store, which is what keeps the Arena working against a
 * database that predates tick history and branching (no `wopr_scenario_ticks`
 * table, no lineage columns). Memory survives until the server restarts.
 */

type Extras = Pick<WoprScenario, 'initial_world_state' | 'parent_scenario_id' | 'branch_turn'>

const globalForWopr = globalThis as typeof globalThis & {
  __woprScenarioMemory?: Map<string, WoprScenario>
  __woprTickMemory?: Map<string, Map<number, TickRecord>>
  __woprExtrasMemory?: Map<string, Extras>
}

const memory = globalForWopr.__woprScenarioMemory ?? new Map<string, WoprScenario>()
if (!globalForWopr.__woprScenarioMemory) globalForWopr.__woprScenarioMemory = memory

const tickMemory = globalForWopr.__woprTickMemory ?? new Map<string, Map<number, TickRecord>>()
if (!globalForWopr.__woprTickMemory) globalForWopr.__woprTickMemory = tickMemory

/** Lineage and initial laydown for rows written to a database without those columns. */
const extrasMemory = globalForWopr.__woprExtrasMemory ?? new Map<string, Extras>()
if (!globalForWopr.__woprExtrasMemory) globalForWopr.__woprExtrasMemory = extrasMemory

function saveToMemory(scenario: WoprScenario): void {
  memory.set(scenario.id, scenario)
}

function saveTickToMemory(scenarioId: string, record: TickRecord): void {
  const byTurn = tickMemory.get(scenarioId) ?? new Map<number, TickRecord>()
  byTurn.set(record.turn, record)
  tickMemory.set(scenarioId, byTurn)
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
  return [...byId.values()].sort(byListOrder)
}

/** Originals before branches, then most elapsed first. Branches follow the scenarios they came from. */
export function byListOrder(a: WoprScenario, b: WoprScenario): number {
  const branchA = a.parent_scenario_id ? 1 : 0
  const branchB = b.parent_scenario_id ? 1 : 0
  return branchA - branchB || b.elapsed_min - a.elapsed_min
}

/**
 * Demo tenant only: hide placeholder rows ("test 1") and add any demo
 * scenario the list does not already hold (by id). A stored or advanced
 * copy of a demo scenario always wins over the code definition.
 */
export function applyDemoScenarios(list: WoprScenario[], demos: WoprScenario[]): WoprScenario[] {
  const kept = list.filter((s) => !isPlaceholderScenarioName(s.name))
  const have = new Set(kept.map((s) => s.id))
  for (const d of demos) if (!have.has(d.id)) kept.push(d)
  return kept.sort(byListOrder)
}

function isDemoTenant(tenantId: string): boolean {
  return tenantId === getDemoTenantId()
}

function withDemo(list: WoprScenario[], tenantId: string): WoprScenario[] {
  if (!isDemoTenant(tenantId)) return list
  const have = new Set(list.map((s) => s.id))
  const demos = demoWoprScenarios(tenantId).filter((d) => !have.has(d.id))
  // Keep the code copies in memory so tick, stream, branch and export routes find them.
  for (const d of demos) saveToMemory(d)
  return applyDemoScenarios(list, demos)
}

/** Test helper: clears the in-memory fallback store. */
export function clearMemoryStoreForTests(): void {
  memory.clear()
  tickMemory.clear()
  extrasMemory.clear()
}

export async function listScenarios(tenantId: string): Promise<WoprScenario[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('wopr_scenarios')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    const dbScenarios = (data ?? []).map(rowToScenario)
    for (const s of dbScenarios) saveToMemory(s)
    return withDemo(mergeScenariosForTenant(dbScenarios, tenantId), tenantId)
  } catch {
    return withDemo(mergeScenariosForTenant([], tenantId), tenantId)
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
      // A tick may have advanced the memory copy past a DB row that could
      // not be written (demo rows are not in every database).
      const scenario = rowToScenario(data)
      const mem = memory.get(id)
      const best = mem && mem.tenant_id === tenantId && mem.elapsed_min > scenario.elapsed_min ? mem : scenario
      saveToMemory(best)
      return best
    }
  } catch {
    // Fall through to memory.
  }

  const m = memory.get(id)
  if (m && m.tenant_id === tenantId) return m
  if (isDemoTenant(tenantId) && isDemoScenarioId(id)) {
    const demo = demoWoprScenarios(tenantId).find((d) => d.id === id) ?? null
    if (demo) saveToMemory(demo)
    return demo
  }
  return null
}

export interface CreateScenarioExtras {
  initial_world_state?: WorldState | null
  parent_scenario_id?: string | null
  branch_turn?: number | null
  elapsed_min?: number
  status?: ScenarioStatus
  /** Keep the scenario in process memory only (no database row). */
  memoryOnly?: boolean
}

export async function createScenario(
  tenantId: string,
  userId: string,
  name: string,
  classification: string,
  worldState = createDefaultWorldState(),
  extras: CreateScenarioExtras = {},
): Promise<WoprScenario> {
  const world = worldState
  const lineage: Extras = {
    initial_world_state: extras.initial_world_state === undefined ? world : extras.initial_world_state,
    parent_scenario_id: extras.parent_scenario_id ?? null,
    branch_turn: extras.branch_turn ?? null,
  }
  const elapsed = extras.elapsed_min ?? world.battlespace.time.mission_elapsed_min ?? 0
  const status = extras.status ?? 'draft'
  const base = {
    tenant_id: tenantId,
    name,
    classification,
    world_state: world,
    elapsed_min: elapsed,
    status,
    created_by: userId,
  }
  try {
    if (extras.memoryOnly) throw new Error('memory only')
    const supabase = await createClient()
    let { data, error } = await supabase
      .from('wopr_scenarios')
      .insert({ ...base, ...lineage })
      .select('*')
      .single()
    if (error) {
      // Older schema without lineage columns: keep the row, hold lineage in memory.
      ;({ data, error } = await supabase.from('wopr_scenarios').insert(base).select('*').single())
      if (error) throw error
    }
    extrasMemory.set((data as { id: string }).id, lineage)
    const scenario = rowToScenario(data as Record<string, unknown>)
    saveToMemory(scenario)
    return scenario
  } catch {
    const scenario: WoprScenario = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      name,
      classification,
      world_state: world,
      elapsed_min: elapsed,
      status,
      ...lineage,
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
    // Memory already updated: DB write failed silently for fallback mode
  }
}

// ── Tick history ────────────────────────────────────────────────────────────

/** Persist one turn and the world as it stood after it. */
export async function appendTick(scenario: WoprScenario, tick: TickResult): Promise<void> {
  // Make sure a demo scenario's recorded history is in place before the new turn joins it.
  seedDemoTicks(scenario.id)
  const record: TickRecord = {
    turn: tick.turn,
    elapsed_min: tick.elapsed_min,
    tick,
    world_state: scenario.world_state,
    created_at: new Date().toISOString(),
  }
  saveTickToMemory(scenario.id, record)
  try {
    const supabase = await createClient()
    await supabase.from('wopr_scenario_ticks').upsert(
      {
        scenario_id: scenario.id,
        tenant_id: scenario.tenant_id,
        turn: record.turn,
        elapsed_min: record.elapsed_min,
        tick: record.tick,
        world_state: record.world_state,
      },
      { onConflict: 'scenario_id,turn' },
    )
  } catch {
    // Memory holds the turn; the replay survives until the server restarts.
  }
}

function seedDemoTicks(scenarioId: string): void {
  if (!isDemoScenarioId(scenarioId) || tickMemory.has(scenarioId)) return
  for (const t of demoWoprTicks(scenarioId)) saveTickToMemory(scenarioId, t)
}

/** Every recorded turn for a scenario, oldest first. */
export async function listTicks(scenarioId: string, tenantId: string): Promise<TickRecord[]> {
  seedDemoTicks(scenarioId)
  const byTurn = new Map<number, TickRecord>()
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('wopr_scenario_ticks')
      .select('turn, elapsed_min, tick, world_state, created_at')
      .eq('scenario_id', scenarioId)
      .eq('tenant_id', tenantId)
      .order('turn', { ascending: true })
    if (error) throw error
    for (const row of data ?? []) {
      byTurn.set(Number(row.turn), {
        turn: Number(row.turn),
        elapsed_min: Number(row.elapsed_min),
        tick: row.tick as TickResult,
        world_state: (row.world_state as WorldState | null) ?? null,
        created_at: row.created_at as string,
      })
    }
  } catch {
    // No history table in this database: memory only.
  }
  for (const r of tickMemory.get(scenarioId)?.values() ?? []) {
    if (!byTurn.has(r.turn)) byTurn.set(r.turn, r)
  }
  return [...byTurn.values()].sort((a, b) => a.turn - b.turn)
}

async function copyTicks(target: WoprScenario, ticks: TickRecord[]): Promise<void> {
  for (const t of ticks) saveTickToMemory(target.id, t)
  if (ticks.length === 0) return
  try {
    const supabase = await createClient()
    await supabase.from('wopr_scenario_ticks').upsert(
      ticks.map((t) => ({
        scenario_id: target.id,
        tenant_id: target.tenant_id,
        turn: t.turn,
        elapsed_min: t.elapsed_min,
        tick: t.tick,
        world_state: t.world_state ?? null,
      })),
      { onConflict: 'scenario_id,turn' },
    )
  } catch {
    // Memory copy stands.
  }
}

export interface BranchResult {
  scenario: WoprScenario
  ticks: TickRecord[]
  plan: Pick<BranchPlan, 'branch_turn' | 'approximate'>
}

/** Fork `sourceId` at `atTurn` into a new scenario that carries the history up to that turn. */
export async function branchScenario(
  tenantId: string,
  userId: string,
  sourceId: string,
  atTurn: number,
): Promise<BranchResult | null> {
  const source = await getScenario(sourceId, tenantId)
  if (!source) return null
  const history = await listTicks(sourceId, tenantId)
  const plan = planBranch(source, history, atTurn)
  // A branch of a code-defined demo scenario stays in memory: its parent has
  // no database row, and demo play should not leave rows behind.
  const memoryOnly = isDemoScenarioId(sourceId) || !(await existsInDb(sourceId, tenantId))
  // Two branches at the same turn are different games; keep their names apart.
  const taken = new Set((await listScenarios(tenantId)).map((s) => s.name))
  let name = plan.name
  for (let n = 2; taken.has(name); n++) name = `${plan.name} (${n})`
  const scenario = await createScenario(
    tenantId,
    userId,
    name,
    source.classification,
    plan.world_state,
    {
      initial_world_state: plan.initial_world_state,
      parent_scenario_id: plan.parent_scenario_id,
      branch_turn: plan.branch_turn,
      elapsed_min: plan.elapsed_min,
      status: plan.status,
      memoryOnly,
    },
  )
  await copyTicks(scenario, plan.ticks)
  return { scenario, ticks: plan.ticks, plan: { branch_turn: plan.branch_turn, approximate: plan.approximate } }
}

async function existsInDb(id: string, tenantId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('wopr_scenarios')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return !error && Boolean(data)
  } catch {
    return false
  }
}

function rowToScenario(row: Record<string, unknown>): WoprScenario {
  const id = row.id as string
  const held = extrasMemory.get(id)
  const pick = <K extends keyof Extras>(k: K): Extras[K] =>
    (row[k] as Extras[K] | undefined) ?? held?.[k] ?? null
  return {
    id,
    tenant_id: row.tenant_id as string,
    name: row.name as string,
    classification: row.classification as string,
    world_state: row.world_state as WoprScenario['world_state'],
    elapsed_min: Number(row.elapsed_min ?? 0),
    status: row.status as WoprScenario['status'],
    initial_world_state: pick('initial_world_state'),
    parent_scenario_id: pick('parent_scenario_id'),
    branch_turn: row.branch_turn == null ? (held?.branch_turn ?? null) : Number(row.branch_turn),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  }
}
