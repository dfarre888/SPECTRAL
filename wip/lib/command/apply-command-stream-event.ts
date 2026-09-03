/**
 * Client-side helpers for Ops Command board SSE events.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { GoNoGoAssessment, GoNoGoStatus } from '@/lib/command/go-no-go-types'

const VALID_STATUS: ReadonlySet<string> = new Set(['go', 'caution', 'no_go'])

export type CommandPlanStreamEvent = {
  type: string
  payload?: unknown
  publishedAt?: number
  planId?: string
  tenantId?: string | null
}

/** Parse SSE `data:` JSON; returns null for heartbeats / malformed / ignore types. */
export function parseCommandPlanStreamData(raw: string): CommandPlanStreamEvent | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const data = JSON.parse(trimmed) as CommandPlanStreamEvent
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return null
    if (data.type === 'connected' || data.type === 'close') return null
    return data
  } catch {
    return null
  }
}

/**
 * Apply operator GO/CAUTION/NO-GO decision from SSE onto current board assessment.
 * Returns null if payload is invalid (caller should leave state unchanged).
 */
export function applyCommandStreamDecision(
  assessment: GoNoGoAssessment,
  payload: unknown,
): GoNoGoAssessment | null {
  if (!payload || typeof payload !== 'object') return null
  const { decision, assessed_at: assessedAt } = payload as {
    decision?: unknown
    assessed_at?: unknown
  }
  if (typeof decision !== 'string' || !VALID_STATUS.has(decision)) return null
  return {
    ...assessment,
    status: decision as GoNoGoStatus,
    assessed_at:
      typeof assessedAt === 'string' && assessedAt.length > 0
        ? assessedAt
        : assessment.assessed_at,
  }
}
