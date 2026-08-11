import { ParticipantNav } from '@/components/iep/ParticipantNav'

export default function ParticipantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  return (
    <div>
      <ParticipantNav participantId={params.id} />
      {children}
    </div>
  )
}
