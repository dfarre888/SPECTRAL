/**
 * AeroCopilot model route.
 *
 *   GET   which engine answers on this instance (lib/spectrum/aerocopilot-mode.ts).
 *         The dock calls this once; in offline mode it never POSTs here and
 *         answers instantly in the browser.
 *   POST  Claude via AWS Bedrock, only when SPECTRAL_AI_MODE=bedrock and AWS
 *         credentials exist. The answer is labelled with the engine and model
 *         id, cited records are checked against the supplied library (ids the
 *         model invents are dropped), and the answer is written to the
 *         append-only ai_audit_log from here, on the server.
 */
import { NextResponse } from 'next/server'
import { callBedrock } from '@/lib/claude/bedrock'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { AEROCOPILOT_SYSTEM, buildCopilotUserMessage } from '@/lib/spectrum/aerocopilot-llm'
import type { CopilotResponse } from '@/lib/spectrum/aerocopilot'
import type { EngineCopilotResponse } from '@/lib/spectrum/aerocopilot-engine'
import { resolveAiMode } from '@/lib/spectrum/aerocopilot-mode'
import { MAX_QUESTION_CHARS, recordAiAnswer } from '@/lib/trust/ai-audit'
import type { Platform, Side } from '@/lib/spectrum/types'
import type { RadarSystem } from '@/lib/spectrum/radar-types'
import type { EffectorSystem } from '@/lib/spectrum/effector-types'

export const dynamic = 'force-dynamic'

function parseCopilotResponse(text: string): CopilotResponse | null {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned) as CopilotResponse
    if (typeof parsed.answer !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export async function GET() {
  return NextResponse.json(resolveAiMode())
}

export async function POST(req: Request) {
  const mode = resolveAiMode()
  if (mode.engine.engine !== 'bedrock') {
    return NextResponse.json({ error: 'Model disabled on this instance', ...mode }, { status: 409 })
  }

  if (!isDemoMode()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: {
    query?: string
    platforms?: Platform[]
    radars?: RadarSystem[]
    effectors?: EffectorSystem[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query || query.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: 'query required' }, { status: 400 })
  }

  const platforms = body.platforms ?? []
  const radars = body.radars ?? []
  const effectors = body.effectors ?? []

  try {
    const text = await callBedrock({
      system: AEROCOPILOT_SYSTEM,
      userContent: buildCopilotUserMessage(query, platforms, radars, effectors),
      maxTokens: 1200,
      temperature: 0.3,
    })

    const parsed = parseCopilotResponse(text)
    if (!parsed) {
      return NextResponse.json({ error: 'Malformed model response' }, { status: 502 })
    }

    // Sources must be real library records: drop any id the model invented,
    // and take the side from the record, not from the model.
    const known = new Map<string, Side>()
    for (const p of platforms) known.set(p.id, p.side ?? 'neutral')
    for (const r of radars) known.set(r.id, r.side ?? 'neutral')
    for (const e of effectors) known.set(e.id, e.side ?? 'neutral')
    const refs = (parsed.refs ?? [])
      .filter((r) => r && typeof r.id === 'string' && known.has(r.id))
      .map((r) => ({ id: r.id, name: String(r.name ?? r.id), side: known.get(r.id) as Side }))

    const audit = await recordAiAnswer(
      {
        feature: 'aerocopilot',
        question: query,
        engine: 'bedrock',
        modelId: mode.engine.modelId,
        answer: parsed.answer,
        refs,
        recordedBy: 'server',
      },
      req,
    )
    if (!audit.ok) console.error('[POST /api/aerocopilot] audit write failed:', audit.error)

    const out: EngineCopilotResponse = {
      ...parsed,
      refs,
      engine: mode.engine,
      audit: audit.ok ? { id: audit.id, answerSha256: audit.answerSha256, store: audit.store } : null,
    }
    return NextResponse.json(out)
  } catch (err) {
    console.error('[POST /api/aerocopilot]', err)
    return NextResponse.json({ error: 'Copilot request failed' }, { status: 502 })
  }
}
