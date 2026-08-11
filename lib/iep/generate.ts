import 'server-only'
import { callBedrockWithModel } from '@/lib/claude/bedrock'
import {
  buildGenerationUserMessage,
  hasAcademicPerformanceData,
  IEP_GENERATION_SYSTEM_PROMPT,
  participantPiiValues,
  type ContextChunk,
  type IepGenerationContext,
  type ParticipantInsightRow,
} from '@/lib/iep/context-builder'
import { deidentify, reidentify } from '@/lib/iep/deidentify'
import {
  IEP_SONNET_MODEL_ID,
  resolveIepModelId,
  type IepModelChoice,
} from '@/lib/iep/model-config'
import { getParticipant } from '@/lib/iep/plan-store'
import { extractJsonFromLlm, parseGeneratedIepDraft } from '@/lib/iep/schemas'
import type { GeneratedIepDraft, IepIntakePayload, NdisGoalRow } from '@/lib/iep/types'
import { createClient } from '@/lib/supabase/server'

async function loadNdisGoals(participantId: string): Promise<NdisGoalRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('participant_id', participantId)
    .eq('status', 'active')
    .order('target_date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as NdisGoalRow[]
}

async function loadInsights(participantId: string): Promise<ParticipantInsightRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('participant_insights')
    .select('recommendations, support_gaps')
    .eq('participant_id', participantId)
    .maybeSingle()
  return (data as ParticipantInsightRow | null) ?? null
}

async function loadDocumentChunks(participantId: string): Promise<ContextChunk[]> {
  const supabase = await createClient()
  const { data: docs } = await supabase
    .from('participant_documents')
    .select('id, title, doc_type')
    .eq('participant_id', participantId)
    .in('doc_type', ['psych', 'ot', 'speech', 'school', 'medical', 'report'])

  if (!docs?.length) return []

  const docMap = new Map(docs.map((d) => [d.id, d]))
  const ids = docs.map((d) => d.id)
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('document_id, content, chunk_index')
    .in('document_id', ids)
    .order('chunk_index')
    .limit(12)

  return (chunks ?? []).map((c) => {
    const doc = docMap.get(c.document_id as string)
    return {
      doc_type: (doc?.doc_type as string) ?? 'report',
      title: (doc?.title as string) ?? 'Report',
      content: (c.content as string).slice(0, 2000),
    }
  })
}

export async function buildIepGenerationContext(
  tenantId: string,
  intake: IepIntakePayload,
): Promise<IepGenerationContext> {
  const participant = await getParticipant(intake.participantId, tenantId)
  if (!participant) throw new Error('Participant not found')

  const [ndisGoals, insights, documentChunks] = await Promise.all([
    loadNdisGoals(intake.participantId),
    loadInsights(intake.participantId),
    loadDocumentChunks(intake.participantId),
  ])

  return {
    participant,
    ndisGoals,
    insights,
    documentChunks,
    intake,
    hasAcademicData: hasAcademicPerformanceData(intake.presentLevels),
  }
}

export async function generateIepDraftFromContext(
  ctx: IepGenerationContext,
  modelChoice: IepModelChoice = 'haiku',
): Promise<{ draft: GeneratedIepDraft; modelId: string; modelOverride: string | null }> {
  const pii = participantPiiValues(ctx.participant)
  const userMessage = buildGenerationUserMessage(ctx)
  const { text: deidUser, map } = deidentify(userMessage, pii)

  const modelId = resolveIepModelId(modelChoice)
  let raw = await callBedrockWithModel({
    modelId,
    system: IEP_GENERATION_SYSTEM_PROMPT,
    userContent: deidUser,
    maxTokens: 4096,
    temperature: 0.25,
  })

  raw = reidentify(raw, map)

  let parsed: GeneratedIepDraft
  try {
    parsed = parseGeneratedIepDraft(extractJsonFromLlm(raw))
  } catch {
    raw = await callBedrockWithModel({
      modelId,
      system: IEP_GENERATION_SYSTEM_PROMPT,
      userContent: `${deidUser}\n\nYour previous response was invalid JSON. Return ONLY valid JSON.`,
      maxTokens: 4096,
      temperature: 0.2,
    })
    parsed = parseGeneratedIepDraft(extractJsonFromLlm(reidentify(raw, map)))
  }

  return {
    draft: parsed,
    modelId,
    modelOverride: modelChoice === 'sonnet' ? IEP_SONNET_MODEL_ID : null,
  }
}
