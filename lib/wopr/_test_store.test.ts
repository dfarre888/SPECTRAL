import { describe, expect, it, beforeEach } from 'vitest'
import { createDefaultWorldState } from '@/lib/wopr/engine'
import {
  clearMemoryStoreForTests,
  mergeScenariosForTenant,
} from '@/lib/wopr/store'
import type { WoprScenario } from '@/lib/wopr/types'

const TENANT_A = '11111111-1111-1111-1111-111111111111'
const TENANT_B = '22222222-2222-2222-2222-222222222222'

function makeScenario(
  id: string,
  tenantId: string,
  name: string,
  elapsedMin: number,
): WoprScenario {
  return {
    id,
    tenant_id: tenantId,
    name,
    classification: 'UNCLASSIFIED',
    world_state: createDefaultWorldState(),
    elapsed_min: elapsedMin,
    status: 'draft',
  }
}

describe('mergeScenariosForTenant', () => {
  beforeEach(() => {
    clearMemoryStoreForTests()
  })

  it('returns DB scenarios for the tenant sorted by elapsed_min descending', () => {
    const db = [
      makeScenario('a', TENANT_A, 'Low time', 0),
      makeScenario('b', TENANT_A, 'High time', 45),
    ]
    const merged = mergeScenariosForTenant(db, TENANT_A, new Map())
    expect(merged.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('filters out scenarios from other tenants', () => {
    const db = [
      makeScenario('a', TENANT_A, 'A', 10),
      makeScenario('b', TENANT_B, 'B', 20),
    ]
    const merged = mergeScenariosForTenant(db, TENANT_A, new Map())
    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('a')
  })

  it('overlays memory scenarios on DB rows with same id', () => {
    const db = [makeScenario('x', TENANT_A, 'DB name', 0)]
    const memory = new Map<string, WoprScenario>()
    memory.set('x', makeScenario('x', TENANT_A, 'Memory name', 30))
    const merged = mergeScenariosForTenant(db, TENANT_A, memory)
    expect(merged).toHaveLength(1)
    expect(merged[0].name).toBe('Memory name')
    expect(merged[0].elapsed_min).toBe(30)
  })

  it('includes memory-only scenarios when DB is empty (fallback path)', () => {
    const memory = new Map<string, WoprScenario>()
    memory.set('mem-1', makeScenario('mem-1', TENANT_A, 'Fallback', 15))
    const merged = mergeScenariosForTenant([], TENANT_A, memory)
    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('mem-1')
  })

  it('merges distinct DB and memory ids for the same tenant', () => {
    const db = [makeScenario('db-1', TENANT_A, 'From DB', 5)]
    const memory = new Map<string, WoprScenario>()
    memory.set('mem-1', makeScenario('mem-1', TENANT_A, 'From memory', 25))
    const merged = mergeScenariosForTenant(db, TENANT_A, memory)
    expect(merged.map((s) => s.id).sort()).toEqual(['db-1', 'mem-1'])
  })
})
