'use client'

import { useEffect, useState } from 'react'
import { bannerForClassification, type ClassificationMarking } from '@/lib/operations/classification'

export function ClassificationBanner() {
  const [marking, setMarking] = useState<ClassificationMarking>('UNCLASSIFIED')

  useEffect(() => {
    fetch('/api/v1/session/classification')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.classification) setMarking(j.classification)
      })
      .catch(() => {})
  }, [])

  return <div className="classification-banner">{bannerForClassification(marking)}</div>
}
