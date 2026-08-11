import { notFound } from 'next/navigation'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { IepIntakeForm } from '@/components/iep/IepIntakeForm'
import { getParticipant } from '@/lib/iep/plan-store'
import { requireTenantContext } from '@/lib/operations/tenant'

export default async function IepNewPage({ params }: { params: { id: string } }) {
  const ctx = await requireTenantContext()
  const participant = await getParticipant(params.id, ctx.tenantId)
  if (!participant) notFound()

  return (
    <HubPageShell
      eyebrow="IEP Generator"
      title="New school plan"
      subtitle="AI-assisted NCCD draft — support coordinator intake"
    >
      <IepIntakeForm
        participantId={params.id}
        participantName={participant.preferred_name ?? participant.full_name}
      />
    </HubPageShell>
  )
}
