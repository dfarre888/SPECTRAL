'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import type { ConflictCaseStudy } from '@/data/seed-conflicts'
import { caseStudyToMapIncidents } from '@/lib/conflicts/case-study-map'

const ConflictCesiumMap = dynamic(
  () => import('@/components/conflict/ConflictCesiumMap').then((m) => m.ConflictCesiumMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] rounded-xl border border-[var(--store-line)] bg-[#0A0A0F] flex items-center justify-center text-xs font-mono store-text-muted">
        Loading globe…
      </div>
    ),
  },
)

export function ConflictCaseStudyMap({ study }: { study: ConflictCaseStudy }) {
  const incidents = useMemo(() => caseStudyToMapIncidents(study), [study])
  const [selectedId, setSelectedId] = useState<string | null>(() => incidents[0]?.id ?? null)

  if (incidents.length === 0) {
    return (
      <div className="h-[200px] rounded-xl border border-[var(--store-line)] bg-[var(--store-surface-2)] flex items-center justify-center text-xs font-mono store-text-muted">
        No geolocated incidents for this case study
      </div>
    )
  }

  return (
    <ConflictCesiumMap
      incidents={incidents}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  )
}
