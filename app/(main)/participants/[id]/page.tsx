import { notFound } from 'next/navigation'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { getParticipant } from '@/lib/iep/plan-store'
import { requireTenantContext } from '@/lib/operations/tenant'
import Link from 'next/link'

export default async function ParticipantProfilePage({ params }: { params: { id: string } }) {
  const ctx = await requireTenantContext()
  const participant = await getParticipant(params.id, ctx.tenantId)
  if (!participant) notFound()

  return (
    <HubPageShell
      eyebrow="Participant"
      title={participant.preferred_name ?? participant.full_name}
      subtitle={participant.primary_disability ?? 'Profile'}
      headerAction={
        <Link
          href={`/participants/${params.id}/iep/new`}
          className="store-btn-primary px-3 py-2 rounded-xl text-xs"
        >
          New school plan
        </Link>
      }
    >
      <dl className="grid gap-3 text-sm max-w-lg">
        <div>
          <dt className="text-xs store-text-muted font-mono">Diagnoses</dt>
          <dd className="text-white">{participant.diagnoses.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs store-text-muted font-mono">Communication</dt>
          <dd className="store-text-body">{participant.communication_notes ?? '—'}</dd>
        </div>
        <div>
          <Link href={`/participants/${params.id}/iep`} className="text-cyan text-sm">
            View IEP history →
          </Link>
        </div>
      </dl>
    </HubPageShell>
  )
}
