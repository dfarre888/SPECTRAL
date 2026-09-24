import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { OFFLINE_DEFEAT_SYSTEMS } from '@/lib/pcm/defeat-matrix-offline-data'
import { normaliseItems, type CatalogueSystem, type PackageItem, type SitePlan } from '@/lib/base-protection/coverage'
import type { EvidencePayload, EvidenceRecord, VerifiedRecord } from '@/lib/base-protection/evidence'
import { computeRecordHash, verifyRecordChain } from '@/lib/base-protection/evidence-hash'
import { buildExerciseSeed } from '@/lib/base-protection/exercise-seed'
import { getSite } from '@/lib/base-protection/sites'

/**
 * Where a read or write landed. 'memory' means the tables are not in the
 * connected database (migration not applied), so data lives in this server
 * process only. The UI says so rather than pretending it was saved.
 */
export type Storage = 'database' | 'memory'

const PLANS_TABLE = 'base_protection_site_plans'
const EVIDENCE_TABLE = 'base_protection_evidence'

// ── Storage availability ─────────────────────────────────────────────────

/**
 * Errors that mean "this database cannot hold the log right now" rather than
 * "this request is wrong": the table is missing (migration not applied), the
 * key is rejected, or the database is unreachable. These fall back to the
 * in-memory store and the UI says so. Constraint violations and other data
 * errors still surface.
 */
function isStorageUnavailable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST301' ||
    error.code === '42501' ||
    /could not find the table|does not exist|schema cache|invalid api key|jwt|fetch failed|network|ECONNREFUSED|ENOTFOUND|permission denied/i.test(
      error.message ?? '',
    )
  )
}

async function tryClient() {
  try {
    return await createClient()
  } catch {
    return null
  }
}

// ── In-memory fallback (per tenant) ──────────────────────────────────────

const memPlans = new Map<string, Map<string, SitePlan>>()
const memEvidence = new Map<string, EvidenceRecord[]>()

function memPlanMap(tenantId: string): Map<string, SitePlan> {
  let m = memPlans.get(tenantId)
  if (!m) memPlans.set(tenantId, (m = new Map()))
  return m
}

function memEvidenceList(tenantId: string): EvidenceRecord[] {
  let l = memEvidence.get(tenantId)
  if (!l) memEvidence.set(tenantId, (l = buildExerciseSeed()))
  return l
}

// ── Catalogue ────────────────────────────────────────────────────────────

export interface CatalogueResult {
  systems: CatalogueSystem[]
  source: 'database' | 'offline'
}

const CATALOGUE_COLUMNS =
  'id, name, manufacturer, country, defeat_method, effective_range_m, price_usd_approx, portability, data_confidence, sources'

export async function loadCatalogue(): Promise<CatalogueResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('anti_drone_systems').select(CATALOGUE_COLUMNS).order('name')
    if (error) throw error
    return { systems: (data ?? []) as CatalogueSystem[], source: 'database' }
  } catch {
    return {
      systems: OFFLINE_DEFEAT_SYSTEMS.map((s) => ({
        id: s.id,
        name: s.name,
        manufacturer: s.manufacturer,
        country: s.country,
        defeat_method: s.defeat_method,
        effective_range_m: s.effective_range_m,
        price_usd_approx: s.price_usd_approx,
        portability: s.portability,
        data_confidence: s.data_confidence,
        sources: s.sources,
      })),
      source: 'offline',
    }
  }
}

// ── Plans ────────────────────────────────────────────────────────────────

interface PlanRow {
  site_id: string
  items: unknown
  radius_m: number | null
  updated_at: string | null
  is_example?: boolean | null
}

function rowToPlan(r: PlanRow): SitePlan {
  const items = Array.isArray(r.items)
    ? (r.items as Array<{ systemId?: string; system_id?: string; qty?: number }>).map((i) => ({
        systemId: String(i.systemId ?? i.system_id ?? ''),
        qty: Number(i.qty ?? 1),
      }))
    : []
  return {
    siteId: r.site_id,
    items: normaliseItems(items),
    radiusM: r.radius_m ?? null,
    updatedAt: r.updated_at,
    isExample: r.is_example === true,
  }
}

export async function listPlans(tenantId: string): Promise<{ plans: SitePlan[]; storage: Storage }> {
  const supabase = await tryClient()
  if (!supabase) return { plans: [...memPlanMap(tenantId).values()], storage: 'memory' }
  const { data, error } = await supabase
    .from(PLANS_TABLE)
    // '*' so a database without the is_example column still loads.
    .select('*')
    .eq('tenant_id', tenantId)
  if (error) {
    if (isStorageUnavailable(error)) return { plans: [...memPlanMap(tenantId).values()], storage: 'memory' }
    throw new Error(error.message)
  }
  return { plans: (data ?? []).map((r) => rowToPlan(r as PlanRow)), storage: 'database' }
}

/**
 * Save a site's package. An empty package with the default radius removes the
 * row, which is the "none assigned" state.
 */
export async function savePlan(
  tenantId: string,
  userId: string | null,
  siteId: string,
  items: PackageItem[],
  radiusM: number | null,
): Promise<{ plan: SitePlan; storage: Storage }> {
  const clean = normaliseItems(items)
  const radius = radiusM != null && Number.isFinite(radiusM) ? Math.round(radiusM) : null
  const now = new Date().toISOString()
  const plan: SitePlan = { siteId, items: clean, radiusM: radius, updatedAt: now }
  const empty = clean.length === 0 && radius == null

  const supabase = await tryClient()
  if (!supabase) {
    const m = memPlanMap(tenantId)
    if (empty) m.delete(siteId)
    else m.set(siteId, plan)
    return { plan, storage: 'memory' }
  }
  const res = empty
    ? await supabase.from(PLANS_TABLE).delete().eq('tenant_id', tenantId).eq('site_id', siteId)
    : await supabase.from(PLANS_TABLE).upsert(
        {
          tenant_id: tenantId,
          site_id: siteId,
          items: clean.map((i) => ({ systemId: i.systemId, qty: i.qty })),
          radius_m: radius,
          updated_by: userId,
          updated_at: now,
          is_example: false,
        },
        { onConflict: 'tenant_id,site_id' },
      )
  if (res.error) {
    if (!isStorageUnavailable(res.error)) throw new Error(res.error.message)
    const m = memPlanMap(tenantId)
    if (empty) m.delete(siteId)
    else m.set(siteId, plan)
    return { plan, storage: 'memory' }
  }
  return { plan, storage: 'database' }
}

// ── Evidence ─────────────────────────────────────────────────────────────

interface EvidenceRow {
  id: string
  record_id: string
  version: number
  prev_hash: string | null
  record_hash: string
  payload: EvidencePayload
  is_exercise: boolean
  site_id: string
  created_at: string
}

function rowToRecord(r: EvidenceRow): EvidenceRecord {
  return {
    id: r.id,
    record_id: r.record_id,
    version: r.version,
    prev_hash: r.prev_hash,
    record_hash: r.record_hash,
    payload: r.payload,
    is_exercise: r.is_exercise,
    site_id: r.site_id,
    created_at: new Date(r.created_at).toISOString(),
  }
}

async function allVersions(tenantId: string): Promise<{ rows: EvidenceRecord[]; storage: Storage }> {
  const supabase = await tryClient()
  if (!supabase) return { rows: [...memEvidenceList(tenantId)], storage: 'memory' }
  const { data, error } = await supabase
    .from(EVIDENCE_TABLE)
    .select('id, record_id, version, prev_hash, record_hash, payload, is_exercise, site_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) {
    if (isStorageUnavailable(error)) return { rows: [...memEvidenceList(tenantId)], storage: 'memory' }
    throw new Error(error.message)
  }
  return { rows: (data ?? []).map((r) => rowToRecord(r as EvidenceRow)), storage: 'database' }
}

function groupVerified(rows: EvidenceRecord[]): Map<string, VerifiedRecord[]> {
  const byRecord = new Map<string, EvidenceRecord[]>()
  for (const r of rows) {
    const l = byRecord.get(r.record_id) ?? []
    l.push(r)
    byRecord.set(r.record_id, l)
  }
  const out = new Map<string, VerifiedRecord[]>()
  for (const [id, versions] of byRecord) out.set(id, verifyRecordChain(versions))
  return out
}

/** Latest version of every record, each re-verified on read. */
export async function listEvidence(tenantId: string): Promise<{ records: VerifiedRecord[]; storage: Storage }> {
  const { rows, storage } = await allVersions(tenantId)
  const records: VerifiedRecord[] = []
  for (const chain of groupVerified(rows).values()) {
    const latest = chain[chain.length - 1]
    records.push({ ...latest, versions: chain.length })
  }
  records.sort((a, b) => b.payload.occurred.utc.localeCompare(a.payload.occurred.utc))
  return { records, storage }
}

export async function getEvidenceChain(
  tenantId: string,
  recordId: string,
): Promise<{ versions: VerifiedRecord[]; storage: Storage }> {
  const { rows, storage } = await allVersions(tenantId)
  return { versions: verifyRecordChain(rows.filter((r) => r.record_id === recordId)), storage }
}

export class EvidenceConflictError extends Error {}

/**
 * Append a record (no recordId) or a new version of an existing record. The
 * server sets created_at, version and prev_hash, then hashes.
 */
export async function appendEvidence(
  tenantId: string,
  userId: string | null,
  payload: EvidencePayload,
  recordId?: string,
): Promise<{ record: VerifiedRecord; storage: Storage }> {
  if (!getSite(payload.site_id)) throw new Error('Unknown site')

  let version = 1
  let prev_hash: string | null = null
  const rid = recordId ?? randomUUID()

  const { rows, storage } = await allVersions(tenantId)
  if (recordId) {
    const chain = verifyRecordChain(rows.filter((r) => r.record_id === recordId))
    if (chain.length === 0) throw new Error('Not found')
    const latest = chain[chain.length - 1]
    if (latest.integrity !== 'verified') throw new EvidenceConflictError('The existing record fails its integrity check.')
    version = latest.version + 1
    prev_hash = latest.record_hash
  }

  const created_at = new Date().toISOString()
  const base = { record_id: rid, version, prev_hash, created_at, payload }
  const record_hash = computeRecordHash(base)
  const record: EvidenceRecord = {
    id: randomUUID(),
    ...base,
    record_hash,
    is_exercise: payload.exercise,
    site_id: payload.site_id,
  }

  if (storage === 'memory') {
    memEvidenceList(tenantId).unshift(record)
    return { record: { ...record, integrity: 'verified', versions: version }, storage }
  }

  const supabase = await tryClient()
  if (!supabase) {
    memEvidenceList(tenantId).unshift(record)
    return { record: { ...record, integrity: 'verified', versions: version }, storage: 'memory' }
  }
  const { error } = await supabase.from(EVIDENCE_TABLE).insert({
    id: record.id,
    tenant_id: tenantId,
    record_id: rid,
    version,
    prev_hash,
    record_hash,
    payload,
    is_exercise: payload.exercise,
    site_id: payload.site_id,
    created_by: userId,
    created_at,
  })
  if (error) {
    if (error.code === '23505') throw new EvidenceConflictError('Another version was saved first. Reload and try again.')
    if (isStorageUnavailable(error)) {
      memEvidenceList(tenantId).unshift(record)
      return { record: { ...record, integrity: 'verified', versions: version }, storage: 'memory' }
    }
    throw new Error(error.message)
  }
  return { record: { ...record, integrity: 'verified', versions: version }, storage }
}
