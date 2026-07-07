import { NextResponse } from 'next/server'
import { callBedrock } from '@/lib/claude/bedrock'
import { createClient } from '@/lib/supabase/server'
import {
  AEROCOPILOT_SYSTEM,
  buildCopilotUserMessage,
} from '@/lib/spectrum/aerocopilot-llm'
import type { CopilotResponse } from '@/lib/spectrum/aerocopilot'
import type { Platform } from '@/lib/spectrum/types'
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

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_EXECUTION_ENV) {
    return NextResponse.json({ error: 'Bedrock credentials not configured' }, { status: 503 })
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
  if (!query) {
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
      return NextResponse.json({ error: 'Malformed model response' }, { status: 400 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[POST /api/aerocopilot]', err)
    return NextResponse.json({ error: 'Copilot request failed' }, { status: 500 })
  }
}
