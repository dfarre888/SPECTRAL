import { NextRequest, NextResponse } from 'next/server'
import { getTrainingAarDocument } from '@/lib/pcm/training-fixtures'
import { isDemoMode } from '@/lib/demo'

export const dynamic = 'force-dynamic'

/** Training AAR fixture when player row / persisted doc missing. */
export async function GET(req: NextRequest) {
  const exerciseId = req.nextUrl.searchParams.get('exercise_id')
  if (!exerciseId) {
    return NextResponse.json({ error: 'exercise_id required' }, { status: 400 })
  }

  const doc = getTrainingAarDocument(exerciseId)
  return NextResponse.json({
    exercise_id: exerciseId,
    player_id: 'training-fixture',
    aar_document: doc,
    overall_grade: doc.overall_grade,
    accreditation_eligible: doc.accreditation_eligible,
    training: true,
    demo: isDemoMode(),
  })
}
