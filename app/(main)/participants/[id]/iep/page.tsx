'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IepHistoryTable } from '@/components/iep/IepHistoryTable'
import { HubPageShell } from '@/components/hub/HubPageShell'
import type { IepPlanRow } from '@/lib/iep/types'

export default function IepHistoryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [plans, setPlans] = useState<IepPlanRow[]>([])

  const load = useCallback(async () => {
    const res = await fetch(`/api/app/iep?participantId=${params.id}`)
    const json = await res.json()
    setPlans(json.data ?? [])
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function duplicate(planId: string) {
    const res = await fetch(`/api/app/iep/${planId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolYear: new Date().getFullYear() + 1 }),
    })
    const json = await res.json()
    if (res.ok) router.push(`/participants/${params.id}/iep/${json.data.id}`)
  }

  return (
    <HubPageShell
      eyebrow="School Plan"
      title="IEP history"
      subtitle="NCCD-compliant individual learning plans"
      headerAction={
        <Link
          href={`/participants/${params.id}/iep/new`}
          className="store-btn-primary px-3 py-2 rounded-xl text-xs"
        >
          New IEP
        </Link>
      }
    >
      <IepHistoryTable participantId={params.id} plans={plans} onDuplicate={duplicate} />
    </HubPageShell>
  )
}
