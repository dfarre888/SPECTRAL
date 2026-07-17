import { NextResponse } from 'next/server'
import { getTrainingExerciseMeta } from '@/lib/pcm/training-fixtures'
import { normalizeExerciseId } from '@/lib/pcm/showcase-exercise'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const exerciseId = normalizeExerciseId(params.id)
  return NextResponse.json(getTrainingExerciseMeta(exerciseId))
}
