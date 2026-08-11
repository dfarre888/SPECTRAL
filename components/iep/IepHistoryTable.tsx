'use client'

import Link from 'next/link'
import type { IepPlanRow } from '@/lib/iep/types'
import { NCCD_ADJUSTMENT_LABELS } from '@/lib/iep/types'
import { StorePanel } from '@/components/ui/store-surface'

interface IepHistoryTableProps {
  participantId: string
  plans: IepPlanRow[]
  onDuplicate?: (planId: string) => void
}

export function IepHistoryTable({ participantId, plans, onDuplicate }: IepHistoryTableProps) {
  if (!plans.length) {
    return (
      <StorePanel className="p-6">
        <p className="text-sm store-text-muted font-mono">No school plans yet.</p>
        <Link
          href={`/participants/${participantId}/iep/new`}
          className="inline-block mt-3 text-sm text-[var(--store-accent)]"
        >
          Create first IEP →
        </Link>
      </StorePanel>
    )
  }

  return (
    <StorePanel className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--store-line)] store-text-muted text-left text-xs font-mono">
            <th className="p-3">School year</th>
            <th className="p-3">Document</th>
            <th className="p-3">School</th>
            <th className="p-3">Level</th>
            <th className="p-3">Status</th>
            <th className="p-3">Updated</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-b border-[var(--store-line)]/50">
              <td className="p-3 font-mono">{p.school_year}</td>
              <td className="p-3">{p.document_title}</td>
              <td className="p-3">{p.school_name ?? '—'}</td>
              <td className="p-3 text-xs">
                {p.nccd_adjustment_level ? NCCD_ADJUSTMENT_LABELS[p.nccd_adjustment_level] : '—'}
              </td>
              <td className="p-3 capitalize">{p.status.replace('_', ' ')}</td>
              <td className="p-3 font-mono text-xs">
                {new Date(p.updated_at).toLocaleDateString('en-AU')}
              </td>
              <td className="p-3 space-x-2 whitespace-nowrap">
                <Link href={`/participants/${participantId}/iep/${p.id}`} className="text-cyan text-xs">
                  Open
                </Link>
                {onDuplicate && (
                  <button type="button" className="text-xs text-[var(--store-accent)]" onClick={() => onDuplicate(p.id)}>
                    New year
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </StorePanel>
  )
}
