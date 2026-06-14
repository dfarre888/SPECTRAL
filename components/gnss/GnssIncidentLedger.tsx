'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import { GnssIncidentDetail } from '@/components/gnss/GnssIncidentDetail'
import type { GnssIncident } from '@/lib/gnss/types'
import { FAILURE_FAMILY_REFERENCE } from '@/lib/gnss/types'
import { EVIDENCE_GRADE_LABEL, evidenceGradeVariant } from '@/lib/gnss/display'
import { cn } from '@/lib/utils'

type FamilyFilter = 'all' | 'gnss_denial'

interface GnssIncidentLedgerProps {
  incidents: GnssIncident[]
}

export function GnssIncidentLedger({ incidents }: GnssIncidentLedgerProps) {
  const [filter, setFilter] = useState<FamilyFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(incidents[0]?.id ?? null)

  const filtered = useMemo(() => {
    const list =
      filter === 'gnss_denial'
        ? incidents.filter((i) => i.failure_family_primary === 'gnss_denial')
        : incidents
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [incidents, filter])

  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null

  return (
    <StorePanel className="p-4 lg:col-span-2 flex flex-col min-h-[420px]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xs store-text-muted uppercase tracking-wider font-semibold">
            Incident ledger ({filtered.length})
          </h2>
          <p className="text-[10px] store-text-muted mt-0.5">
            OSINT RPAS show failures — evidence-graded, not every loss is jamming
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors',
              filter === 'all'
                ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                : 'border-[var(--store-line)] store-text-muted hover:text-white',
            )}
          >
            All families
          </button>
          <button
            type="button"
            onClick={() => setFilter('gnss_denial')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors',
              filter === 'gnss_denial'
                ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                : 'border-[var(--store-line)] store-text-muted hover:text-white',
            )}
          >
            GNSS denial only
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="overflow-y-auto max-h-[60vh] space-y-1.5 pr-1">
          {filtered.map((inc) => {
            const family = FAILURE_FAMILY_REFERENCE[inc.failure_family_primary]
            return (
              <button
                key={inc.id}
                type="button"
                onClick={() => setSelectedId(inc.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl border transition-colors',
                  selected?.id === inc.id
                    ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]'
                    : 'border-[var(--store-line)] bg-[var(--store-surface-2)] hover:border-cyan/30',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white leading-snug">{inc.title}</p>
                  <Badge variant={evidenceGradeVariant(inc.overall_confidence)} className="shrink-0">
                    {EVIDENCE_GRADE_LABEL[inc.overall_confidence]}
                  </Badge>
                </div>
                <p className="text-[10px] font-mono store-text-muted mt-1">
                  {inc.date} · {family.label}
                </p>
              </button>
            )
          })}
        </div>

        <div className="min-h-0 border-l border-[var(--store-line)] pl-4 hidden md:block">
          {selected ? (
            <GnssIncidentDetail incident={selected} />
          ) : (
            <p className="text-sm store-text-muted">Select an incident</p>
          )}
        </div>
      </div>

      {selected && (
        <div className="mt-4 pt-4 border-t border-[var(--store-line)] md:hidden">
          <GnssIncidentDetail incident={selected} />
        </div>
      )}
    </StorePanel>
  )
}
