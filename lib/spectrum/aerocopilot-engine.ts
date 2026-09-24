/**
 * AeroCopilot engine labels, shared by the server route and the dock.
 *
 * Every answer carries the engine that actually produced it. The label is
 * decided where the answer is produced (the browser for the offline engine,
 * the server route for Bedrock), never inferred afterwards.
 */
import type { CopilotResponse } from './aerocopilot'

export type AiEngineId = 'offline' | 'bedrock'

export interface AiEngineInfo {
  engine: AiEngineId
  /** Short label shown under every answer. */
  label: string
  /** One plain sentence on where the answer was computed. */
  detail: string
  /** Model id for Bedrock answers, null for the offline engine. */
  modelId: string | null
  /** AWS region of the endpoint called, null for the offline engine. */
  region: string | null
}

export const ADVICE_ONLY = 'Advice only. A person decides.'

export const OFFLINE_ENGINE: AiEngineInfo = {
  engine: 'offline',
  label: 'Offline engine, no data leaves this instance',
  detail:
    'Deterministic rules over the platform library, run in the browser. No language model and no call outside this instance.',
  modelId: null,
  region: null,
}

export interface CopilotRef {
  id: string
  name: string
  side: string
}

export interface AuditReceipt {
  id: string
  /** SHA-256 of the answer text, hex. */
  answerSha256: string
  /** 'database' (ai_audit_log table) or 'local' (hash-chained file on this instance). */
  store?: 'database' | 'local'
}

/** What /api/aerocopilot returns for a Bedrock answer. */
export interface EngineCopilotResponse extends CopilotResponse {
  engine: AiEngineInfo
  audit: AuditReceipt | null
}

/** GET /api/aerocopilot */
export interface AiModeStatus {
  engine: AiEngineInfo
  /** Why this engine is active, plain English. */
  reason: string
  requested: AiEngineId | null
}
