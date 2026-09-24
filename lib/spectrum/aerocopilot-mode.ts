/**
 * Which engine answers AeroCopilot questions on this instance.
 *
 *   SPECTRAL_AI_MODE=offline   rules engine only (default)
 *   SPECTRAL_AI_MODE=bedrock   Claude via AWS Bedrock, if AWS credentials exist
 *
 * Offline is the default: a model is used only when an administrator both
 * opts in and supplies credentials. Without credentials the setting falls back
 * to offline and says so.
 */
import 'server-only'
import { OFFLINE_ENGINE, type AiEngineId, type AiEngineInfo, type AiModeStatus } from './aerocopilot-engine'

/** Mirrors the client in lib/claude/bedrock.ts (region is fixed there). */
export const BEDROCK_REGION = 'ap-southeast-2'
const BEDROCK_DEFAULT_MODEL_ID = 'ap.anthropic.claude-sonnet-4-6-20250514-v1:0'

export function bedrockModelId(): string {
  return process.env.BEDROCK_MODEL_ID ?? BEDROCK_DEFAULT_MODEL_ID
}

/** Same test the Bedrock route has always used. */
export function bedrockCredentialsPresent(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_EXECUTION_ENV)
}

/**
 * Bedrock cross-region inference profiles are named by prefix. The endpoint is
 * always Sydney; the prefix decides where AWS may run the model.
 */
export function bedrockRouting(modelId: string): { short: string; note: string } {
  const p = modelId.split('.')[0]
  if (p === 'au') return { short: 'Australian routing', note: 'Australian cross-region profile: AWS runs it in its Australian regions.' }
  if (p === 'ap' || p === 'apac')
    return { short: 'Asia Pacific routing', note: 'Asia Pacific cross-region profile: AWS may run it in another Asia Pacific region.' }
  if (p === 'global') return { short: 'global routing', note: 'Global cross-region profile: AWS may run it in any region.' }
  if (p === 'us' || p === 'eu' || p === 'jp')
    return { short: `${p.toUpperCase()} routing`, note: `${p.toUpperCase()} cross-region profile: AWS runs it outside Australia.` }
  return { short: 'in-region', note: 'Single-region model id: runs in the Sydney region.' }
}

export function bedrockEngine(): AiEngineInfo {
  const modelId = bedrockModelId()
  const r = bedrockRouting(modelId)
  return {
    engine: 'bedrock',
    label: `Claude via AWS Bedrock (Sydney endpoint, ${r.short})`,
    detail: `Sent to AWS Bedrock ${BEDROCK_REGION} (Sydney). ${r.note}`,
    modelId,
    region: BEDROCK_REGION,
  }
}

function requestedMode(): AiEngineId | null {
  const v = process.env.SPECTRAL_AI_MODE?.trim().toLowerCase()
  return v === 'offline' || v === 'bedrock' ? v : null
}

export function resolveAiMode(): AiModeStatus {
  const requested = requestedMode()
  if (requested === 'bedrock') {
    if (bedrockCredentialsPresent()) {
      return { engine: bedrockEngine(), requested, reason: 'SPECTRAL_AI_MODE=bedrock and AWS credentials are configured.' }
    }
    return {
      engine: OFFLINE_ENGINE,
      requested,
      reason: 'SPECTRAL_AI_MODE=bedrock, but no AWS credentials are configured, so the offline engine answers.',
    }
  }
  if (requested === 'offline') {
    return { engine: OFFLINE_ENGINE, requested, reason: 'SPECTRAL_AI_MODE=offline.' }
  }
  return {
    engine: OFFLINE_ENGINE,
    requested,
    reason: 'SPECTRAL_AI_MODE is not set, so the offline default applies.',
  }
}
