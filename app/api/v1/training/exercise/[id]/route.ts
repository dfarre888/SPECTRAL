import { NextResponse } from 'next/server'
import { getTrainingExerciseMeta } from '@/lib/pcm/training-fixtures'

export const dynamic = 'force-dynamic'

/** Training exercise metadata — no auth / player row required. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json(getTrainingExerciseMeta(params.id))
}
