import { redirect } from 'next/navigation'
import { PcmExerciseWorkspace } from '@/components/pcm/PcmExerciseWorkspace'
import { normalizeExerciseId } from '@/lib/pcm/showcase-exercise'

export default function PcmExercisePage({ params }: { params: { id: string } }) {
  const exerciseId = normalizeExerciseId(params.id)
  if (exerciseId !== params.id) {
    redirect(`/pcm/exercise/${exerciseId}`)
  }
  return <PcmExerciseWorkspace exerciseId={exerciseId} />
}
