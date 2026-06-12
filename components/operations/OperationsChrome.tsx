'use client'

import { useEffect, useState } from 'react'
import { EditionBadge } from '@/components/operations/EditionBadge'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

export function OperationsChrome() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOperationsEditionClient()) return
    fetch('/api/v1/session/classification')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.tenantId) setTenantId(j.tenantId.slice(0, 8))
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex items-center gap-2">
      <EditionBadge />
      {tenantId && (
        <span
          className="text-[9px] font-mono store-text-muted px-2 py-0.5 rounded-lg border border-[var(--store-line)]"
          title="Tenant scope — customer data isolated"
        >
          TNT {tenantId}
        </span>
      )}
    </div>
  )
}
