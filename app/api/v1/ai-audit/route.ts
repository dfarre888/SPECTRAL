/**
 * AI answer audit log.
 *
 *   POST  record an OFFLINE answer computed in the browser (recorded_by 'client').
 *         Bedrock answers are recorded by /api/aerocopilot itself, on the server
 *         that called the model, so a client cannot claim one.
 *   GET   ?limit=20  latest entries for this tenant (question, engine, model id,
 *         answer SHA-256, cited records). No answer text is stored.
 *
 * Append-only: the table refuses UPDATE, DELETE and TRUNCATE
 * (supabase/migrations/20260924140000_ai_audit_log.sql). Where the connected
 * database has no such table, entries go to a local hash-chained file and the
 * response says `store: 'local'`.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { fetchRecentAiAudit, MAX_QUESTION_CHARS, recordAiAnswer, sanitiseRefs } from '@/lib/trust/ai-audit'

export const dynamic = 'force-dynamic'

async function signedIn(): Promise<boolean> {
  if (isDemoMode()) return true
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return Boolean(user)
}

export async function POST(req: Request) {
  if (!(await signedIn())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const answer = typeof body.answer === 'string' ? body.answer : ''
  if (!question || question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: `question required, at most ${MAX_QUESTION_CHARS} characters` }, { status: 400 })
  }
  if (!answer) return NextResponse.json({ error: 'answer required' }, { status: 400 })
  if (body.engine !== 'offline') {
    return NextResponse.json(
      { error: 'Only offline answers are recorded here. Model answers are recorded by the server that called the model.' },
      { status: 400 },
    )
  }

  const result = await recordAiAnswer(
    {
      feature: typeof body.feature === 'string' && body.feature ? body.feature : 'aerocopilot',
      question,
      engine: 'offline',
      modelId: null,
      answer,
      refs: sanitiseRefs(body.refs),
      recordedBy: 'client',
      fallback: body.fallback === true,
    },
    req,
  )
  if (!result.ok) return NextResponse.json({ error: 'Audit write failed', detail: result.error }, { status: 500 })
  return NextResponse.json({ id: result.id, answerSha256: result.answerSha256, store: result.store }, { status: 201 })
}

export async function GET(req: Request) {
  if (!(await signedIn())) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const limit = Number(new URL(req.url).searchParams.get('limit') ?? '20')
  const summary = await fetchRecentAiAudit(Number.isFinite(limit) ? limit : 20)
  return NextResponse.json(summary)
}
