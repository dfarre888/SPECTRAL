'use client'

import { useEffect, useState } from 'react'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

/**
 * Edition, tenant and role as one quiet capsule. Tenant id and role detail
 * live in the tooltip; the bar only needs to say which edition is live.
 */
export function OperationsChrome() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const operations = isOperationsEditionClient()

  useEffect(() => {
    if (!operations) return
    fetch('/api/v1/session/classification')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.tenantId) setTenantId(j.tenantId.slice(0, 8))
        if (j?.role) setRole(j.role)
      })
      .catch(() => {})
  }, [operations])

  const detail = [
    operations
      ? 'Operations edition: server-side ITU-R propagation and tenant adjudication'
      : 'Training edition: OSINT band overlap only, no server propagation',
    tenantId ? `Tenant ${tenantId} (customer data isolated)` : null,
    role === 'admin' ? 'WOPR administrator: full scenario control' : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <span
      className="hidden sm:inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-full text-[12px] font-medium text-[var(--store-ink-soft)] border border-[var(--glass-line)] bg-[rgba(255,255,255,0.04)]"
      title={detail}
    >
      <span
        className={
          operations
            ? 'w-2 h-2 rounded-full bg-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.9)]'
            : 'w-2 h-2 rounded-full bg-[var(--store-ink-mute)]'
        }
        aria-hidden
      />
      <span className="text-[var(--store-ink)]">{operations ? 'Operations' : 'Training'}</span>
      {role === 'admin' && <span className="store-text-muted">· Admin</span>}
    </span>
  )
}
