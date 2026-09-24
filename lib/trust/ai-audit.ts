/**
 * Append-only log of AI answers. One row per answer shown to a user.
 *
 * Primary store: table ai_audit_log (migration 20260924140000_ai_audit_log.sql),
 * which refuses UPDATE, DELETE and TRUNCATE. If the database this instance is
 * connected to does not have the table (or refuses the write), the row goes to
 * a local hash-chained file instead (lib/trust/ai-audit-local.ts) and says so.
 * Nothing is dropped silently.
 *
 * The answer text is not stored, only its SHA-256, so the log can prove what
 * was shown without becoming a second copy of every answer.
 */
import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireTenantContext, type TenantContext } from '@/lib/operations/tenant'
import type { AiEngineId } from '@/lib/spectrum/aerocopilot-engine'
import { appendLocalAudit, localAuditPath, readLocalAudit } from '@/lib/trust/ai-audit-local'

export interface AiAuditInput {
  feature: string
  question: string
  engine: AiEngineId
  modelId: string | null
  answer: string
  refs: { id: string; name: string; side: string }[]
  recordedBy: 'server' | 'client'
  fallback?: boolean
}

export interface AiAuditRow {
  id: string
  created_at: string
  tenant_id: string | null
  user_id: string | null
  feature: string
  question: string
  engine: AiEngineId
  model_id: string | null
  answer_sha256: string
  answer_chars: number | null
  refs: { id: string; name: string; side: string }[]
  recorded_by: 'server' | 'client'
  fallback: boolean
}

export type AuditStore = 'database' | 'local'

export const MAX_QUESTION_CHARS = 4000
const MAX_REFS = 24

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function sanitiseRefs(input: unknown): AiAuditInput['refs'] {
  if (!Array.isArray(input)) return []
  const out: AiAuditInput['refs'] = []
  for (const r of input) {
    if (!r || typeof r !== 'object') continue
    const { id, name, side } = r as Record<string, unknown>
    if (typeof id !== 'string' || !id) continue
    out.push({
      id: id.slice(0, 200),
      name: typeof name === 'string' ? name.slice(0, 200) : id.slice(0, 200),
      side: side === 'red' || side === 'blue' ? side : 'neutral',
    })
    if (out.length >= MAX_REFS) break
  }
  return out
}

export type RecordResult =
  | { ok: true; id: string; answerSha256: string; store: AuditStore }
  | { ok: false; error: string }

async function tenantOrDefault(request?: Request): Promise<TenantContext | null> {
  try {
    return await requireTenantContext(request)
  } catch {
    return null
  }
}

/** Write one row. Never throws: an audit failure is reported, not fatal to the answer. */
export async function recordAiAnswer(input: AiAuditInput, request?: Request): Promise<RecordResult> {
  const answerSha256 = sha256Hex(input.answer)
  const ctx = await tenantOrDefault(request)
  const row = {
    tenant_id: ctx?.tenantId ?? null,
    user_id: ctx?.userId ?? null,
    feature: input.feature.slice(0, 64),
    question: input.question.slice(0, MAX_QUESTION_CHARS),
    engine: input.engine,
    model_id: input.modelId,
    answer_sha256: answerSha256,
    answer_chars: input.answer.length,
    refs: sanitiseRefs(input.refs),
    recorded_by: input.recordedBy,
    fallback: Boolean(input.fallback),
  }

  let dbError = 'no tenant context'
  if (ctx) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('ai_audit_log')
        .insert({ ...row, classification: ctx.classification })
        .select('id')
        .single()
      if (!error && data) return { ok: true, id: data.id as string, answerSha256, store: 'database' }
      dbError = error?.message ?? 'insert returned no row'
    } catch (err) {
      dbError = (err as Error).message
    }
  }

  try {
    const local = appendLocalAudit({
      ...row,
      id: randomUUID(),
      created_at: new Date().toISOString(),
      store_reason: `Database write failed: ${dbError.slice(0, 200)}`,
    })
    return { ok: true, id: local.id, answerSha256, store: 'local' }
  } catch (err) {
    return { ok: false, error: `database: ${dbError}; local file: ${(err as Error).message}` }
  }
}

export interface AiAuditSummary {
  /** Which store these rows came from. */
  store: AuditStore | null
  rows: AiAuditRow[]
  total: number | null
  byEngine: Record<AiEngineId, number>
  /** Why the database was not used, when store is 'local' or null. */
  databaseError: string | null
  local: { path: string; total: number; intact: boolean; brokenAt: number | null }
}

/** Latest entries for this tenant, newest first, from whichever store works. */
export async function fetchRecentAiAudit(limit = 10): Promise<AiAuditSummary> {
  const n = Math.min(Math.max(limit, 1), 100)
  const chain = readLocalAudit()
  const local = { path: localAuditPath(), total: chain.total, intact: chain.intact, brokenAt: chain.brokenAt }
  let databaseError: string | null = null

  try {
    const ctx = await requireTenantContext()
    const supabase = await createClient()
    const cols =
      'id, created_at, tenant_id, user_id, feature, question, engine, model_id, answer_sha256, answer_chars, refs, recorded_by, fallback'
    const [rows, total, bedrock] = await Promise.all([
      supabase
        .from('ai_audit_log')
        .select(cols)
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(n),
      supabase.from('ai_audit_log').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
      supabase
        .from('ai_audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', ctx.tenantId)
        .eq('engine', 'bedrock'),
    ])
    if (!rows.error) {
      const t = total.count ?? null
      const b = bedrock.count ?? 0
      return {
        store: 'database',
        rows: (rows.data ?? []) as unknown as AiAuditRow[],
        total: t,
        byEngine: { bedrock: b, offline: t != null ? t - b : 0 },
        databaseError: null,
        local,
      }
    }
    databaseError = rows.error.message
  } catch (err) {
    databaseError = (err as Error).message
  }

  if (chain.total > 0) {
    const bedrock = chain.rows.filter((r) => r.engine === 'bedrock').length
    return {
      store: 'local',
      rows: [...chain.rows].reverse().slice(0, n),
      total: chain.total,
      byEngine: { bedrock, offline: chain.total - bedrock },
      databaseError,
      local,
    }
  }
  return { store: null, rows: [], total: 0, byEngine: { offline: 0, bedrock: 0 }, databaseError, local }
}
