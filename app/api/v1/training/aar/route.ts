import { NextRequest, NextResponse } from 'next/server'
import { getTrainingAarDocument } from '@/lib/pcm/training-fixtures'
import { normalizeExerciseId } from '@/lib/pcm/showcase-exercise'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rawId = req.nextUrl.searchParams.get('exercise_id')
  if (!rawId) {
    return NextResponse.json({ error: 'exercise_id required' }, { status: 400 })
  }
  const exerciseId = normalizeExerciseId(rawId)

  const doc = getTrainingAarDocument(exerciseId)
  return NextResponse.json({
    exercise_id: exerciseId,
    player_id: 'spectral-player',
    aar_document: doc,
    overall_grade: doc.overall_grade,
    accreditation_eligible: doc.accreditation_eligible,
  })
}
