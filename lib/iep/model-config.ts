export const IEP_HAIKU_MODEL_ID =
  process.env.BEDROCK_IEP_MODEL_ID ??
  process.env.BEDROCK_HAIKU_MODEL_ID ??
  'ap.anthropic.claude-haiku-4-5-20251001-v1:0'

export const IEP_SONNET_MODEL_ID =
  process.env.BEDROCK_IEP_SONNET_MODEL_ID ??
  'au.anthropic.claude-sonnet-4-6-20250514-v1:0'

export type IepModelChoice = 'haiku' | 'sonnet'

export function isSonnetEnabled(): boolean {
  return process.env.IEP_SONNET_ENABLED === 'true'
}

export function isSonnetEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_IEP_SONNET_ENABLED === 'true'
}

export function resolveIepModelId(override?: IepModelChoice | null): string {
  if (override === 'sonnet') {
    if (!isSonnetEnabled()) {
      throw new Error('Sonnet escalation is not enabled')
    }
    return IEP_SONNET_MODEL_ID
  }
  return IEP_HAIKU_MODEL_ID
}

export function modelChoiceFromOverride(iepModelOverride: string | null): IepModelChoice {
  if (iepModelOverride && iepModelOverride.includes('sonnet')) return 'sonnet'
  return 'haiku'
}
