import { notFound } from 'next/navigation'
import { IepDraftEditor } from '@/components/iep/IepDraftEditor'
import { getIepPlan } from '@/lib/iep/plan-store'

export default async function IepEditorPage({
  params,
}: {
  params: { id: string; iepId: string }
}) {
  const plan = await getIepPlan(params.iepId)
  if (!plan || plan.participant_id !== params.id) notFound()

  return <IepDraftEditor participantId={params.id} initialPlan={plan} />
}
