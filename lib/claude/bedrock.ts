/**
 * SPECTRAL — AWS Bedrock client (sovereign AU inference layer)
 * ─────────────────────────────────────────────────────────────
 * All Claude inference routes through this module.
 * DO NOT instantiate Anthropic SDK anywhere in the codebase —
 * use callBedrock() instead.
 *
 * Data residency:
 *   - Supabase:  ap-southeast-2 (Sydney) — strict in-region ✓
 *   - Bedrock:   ap-southeast-2 via Geo cross-region routing
 *                Primary inference node: Sydney (ap-southeast-2)
 *                Geo routing keeps data within the AP geography (AU/NZ AWS zone)
 *                Strict in-region Claude not yet available on Bedrock — Geo is
 *                the closest option and satisfies UNCLASSIFIED data sovereignty.
 *
 * Prerequisites (one-time setup):
 *   1. AWS Console → Bedrock → Model access → ap-southeast-2
 *      Enable: "Claude Sonnet 4.6" (Anthropic)
 *   2. Create IAM user with policy:
 *      { "Effect": "Allow", "Action": "bedrock:InvokeModel",
 *        "Resource": "arn:aws:bedrock:ap-southeast-2::foundation-model/ap.anthropic.*" }
 *   3. Add to .env.local (and Vercel env vars):
 *        AWS_ACCESS_KEY_ID=...
 *        AWS_SECRET_ACCESS_KEY=...
 *        BEDROCK_MODEL_ID=ap.anthropic.claude-sonnet-4-6-20250514-v1:0
 *      → Verify the exact model ID in:
 *        AWS Console → Bedrock → Model catalog → Claude Sonnet 4.6 → Model ID
 *
 * npm install @aws-sdk/client-bedrock-runtime
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message as BedrockMessage,
} from '@aws-sdk/client-bedrock-runtime'

// ─── Model ID ────────────────────────────────────────────────────────────────
// Geo cross-region inference prefix 'ap.' routes to AP geography (Sydney primary).
// Verify the exact versioned ID in the Bedrock console for ap-southeast-2.
// Default below matches the Claude Sonnet 4.6 release naming pattern.
const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ??
  'ap.anthropic.claude-sonnet-4-6-20250514-v1:0'

// ─── Client singleton ─────────────────────────────────────────────────────────
// Credentials: AWS SDK reads AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY from env.
// On AWS-hosted infra (ECS/Lambda): use instance profile instead (no env vars needed).
let _client: BedrockRuntimeClient | null = null

function getClient(): BedrockRuntimeClient {
  if (!_client) {
    _client = new BedrockRuntimeClient({ region: 'ap-southeast-2' })
  }
  return _client
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface BedrockTextParams {
  /** System prompt string */
  system: string
  /** User turn content string */
  userContent: string
  /** Max tokens to generate (default 2048) */
  maxTokens?: number
  /** Temperature 0–1 (default 0.3 for analytic tasks) */
  temperature?: number
  /** Override model ID (e.g. IEP Haiku / Sonnet escalation) */
  modelId?: string
}

/**
 * Send a single user-turn message to Claude via Bedrock Converse API.
 * Returns the assistant text response.
 * Throws on API or auth error — callers should handle.
 */
export async function callBedrock({
  system,
  userContent,
  maxTokens = 2048,
  temperature = 0.3,
  modelId,
}: BedrockTextParams): Promise<string> {
  return callBedrockWithModel({ system, userContent, maxTokens, temperature, modelId })
}

/**
 * Send a single user-turn message with an explicit model ID override.
 */
export async function callBedrockWithModel({
  system,
  userContent,
  maxTokens = 2048,
  temperature = 0.3,
  modelId = BEDROCK_MODEL_ID,
}: BedrockTextParams & { modelId?: string }): Promise<string> {
  const messages: BedrockMessage[] = [
    { role: 'user', content: [{ text: userContent }] },
  ]

  const cmd = new ConverseCommand({
    modelId,
    system: [{ text: system }],
    messages,
    inferenceConfig: {
      maxTokens,
      temperature,
    },
  })

  const res = await getClient().send(cmd)
  return res.output?.message?.content?.[0]?.text ?? ''
}

/**
 * Multi-turn variant — accepts the full message history.
 * Use for conversational flows (AeroCopilot follow-ups etc).
 */
export async function callBedrockMultiTurn({
  system,
  messages,
  maxTokens = 2048,
  temperature = 0.3,
}: {
  system: string
  messages: BedrockMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const cmd = new ConverseCommand({
    modelId: BEDROCK_MODEL_ID,
    system: [{ text: system }],
    messages,
    inferenceConfig: { maxTokens, temperature },
  })
  const res = await getClient().send(cmd)
  return res.output?.message?.content?.[0]?.text ?? ''
}
