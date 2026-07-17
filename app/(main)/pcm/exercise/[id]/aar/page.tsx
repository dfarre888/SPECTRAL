import { redirect } from 'next/navigation'
import { SpectralAAR } from '@/components/pcm/SpectralAAR'
import { normalizeExerciseId } from '@/lib/pcm/showcase-exercise'

export default function PcmAarPage({ params }: { params: { id: string } }) {
  const exerciseId = normalizeExerciseId(params.id)
  if (exerciseId !== params.id) {
    redirect(`/pcm/exercise/${exerciseId}/aar`)
  }
  return <SpectralAAR exerciseId={exerciseId} />
}
