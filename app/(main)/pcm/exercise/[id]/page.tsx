import { PcmExerciseWorkspace } from '@/components/pcm/PcmExerciseWorkspace'

export default function PcmExercisePage({ params }: { params: { id: string } }) {
  return <PcmExerciseWorkspace exerciseId={params.id} />
}
