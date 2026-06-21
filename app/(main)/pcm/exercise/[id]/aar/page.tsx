import { SpectralAAR } from '@/components/pcm/SpectralAAR'

export default function PcmAarPage({ params }: { params: { id: string } }) {
  return <SpectralAAR exerciseId={params.id} />
}
