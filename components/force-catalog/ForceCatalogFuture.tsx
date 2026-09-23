'use client'

/**
 * Callers: ForceCatalogClient.tsx
 * Purpose: Future programs as one sortable table, IOC soonest first.
 * API/schema: ForceCatalogPlatformFull
 */

import { useMemo, type MouseEvent } from 'react'
import type { ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { ConfidenceTag } from '@/components/force/ConfidenceTag'
import { EmptyState, SideDot } from '@/components/force-catalog/force-catalog-ui'
import { pretty } from '@/components/force-catalog/ForceCatalogFilters'

type Row = ForceCatalogPlatformFull

function iocSortKey(ioc: string | null | undefined): number {
  if (!ioc) return 9999
  const m = /(\d{4})/.exec(ioc)
  return m ? Number(m[1]) : 9999
}

const CONF_RANK: Record<string, number> = { high: 0, medium: 1, classified: 2, estimated: 3 }

export function ForceCatalogFuture({
  programs,
  onSelect,
  selectedId,
  onClear,
  registerCardRef,
}: {
  programs: Row[]
  onSelect: (p: Row) => void
  selectedId: string | null
  onClear: () => void
  registerCardRef?: (id: string, el: HTMLButtonElement | null) => void
}) {
  const sorted = useMemo(() => {
    return [...programs].sort((a, b) => {
      const ka = iocSortKey(a.future?.ioc_est)
      const kb = iocSortKey(b.future?.ioc_est)
      if (ka !== kb) return ka - kb
      const na = (a.future?.program_name ?? a.short_name).toLowerCase()
      const nb = (b.future?.program_name ?? b.short_name).toLowerCase()
      return na.localeCompare(nb)
    })
  }, [programs])

  const columns = useMemo<DataColumn<Row>[]>(
    () => [
      {
        key: 'program',
        header: 'Program',
        width: 260,
        sticky: true,
        sortValue: (p) => p.future?.program_name ?? p.short_name,
        cell: (p) => {
          const name = p.future?.program_name ?? p.short_name
          const selected = selectedId === p.id
          return (
            <button
              type="button"
              ref={(el) => registerCardRef?.(p.id, el)}
              onClick={(e: MouseEvent) => {
                e.stopPropagation()
                onSelect(p)
              }}
              aria-pressed={selected}
              aria-label={selected ? `Close detail for ${name}` : `Open detail for ${name}`}
              className="flex w-full min-w-0 items-center gap-2.5 text-left"
            >
              <SideDot side={p.force_side} />
              <span className="min-w-0 flex-1">
                <span className="primary block truncate" title={name}>{name}</span>
                <span className="meta truncate font-mono" title={p.designation}>{p.designation}</span>
              </span>
            </button>
          )
        },
      },
      {
        key: 'nation',
        header: 'Nation',
        width: 130,
        sortValue: (p) => p.nation_code,
        cell: (p) => (
          <div className="min-w-0">
            <span className="block font-mono text-[var(--store-ink)]" title={p.nation_name}>{p.nation_code}</span>
            {p.future?.partner_nations?.length ? (
              <span className="meta truncate" title={`Partners: ${p.future.partner_nations.join(', ')}`}>
                with <span className="font-mono">{p.future.partner_nations.join(', ')}</span>
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'ioc',
        header: 'IOC estimate',
        width: 150,
        sortValue: (p) => iocSortKey(p.future?.ioc_est),
        cell: (p) => (
          <div className="min-w-0">
            <span className="block truncate font-mono text-[12px] text-[var(--store-ink)]">{p.future?.ioc_est ?? 'TBD'}</span>
            <span className="meta truncate">{pretty(p.program_stage)}</span>
          </div>
        ),
      },
      {
        key: 'lead',
        header: 'Lead contractor',
        width: 190,
        sortValue: (p) => p.future?.lead_contractor ?? p.manufacturer ?? '',
        cell: (p) => {
          const lead = p.future?.lead_contractor ?? p.manufacturer
          return lead ? (
            <span className="line-clamp-2 leading-snug" title={lead}>{lead}</span>
          ) : (
            <span className="store-text-muted">Not stated</span>
          )
        },
      },
      {
        key: 'conf',
        header: 'Confidence',
        width: 116,
        sortValue: (p) => CONF_RANK[p.future?.data_confidence ?? p.data_confidence] ?? 9,
        cell: (p) => <ConfidenceTag confidence={p.future?.data_confidence ?? p.data_confidence} />,
      },
      {
        key: 'note',
        header: 'Status note',
        width: 230,
        cell: (p) =>
          p.future?.status_note ? (
            <span className="line-clamp-2 whitespace-normal leading-snug store-text-body" title={p.future.status_note}>
              {p.future.status_note}
            </span>
          ) : null,
      },
    ],
    [onSelect, registerCardRef, selectedId],
  )

  if (sorted.length === 0) {
    return <EmptyState message="No future programs in the current filter." onClear={onClear} />
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] store-text-muted">
        <span className="font-mono tabular-nums text-[var(--store-ink)]">{sorted.length}</span> future programs, earliest
        IOC first · click a row for the dossier
      </p>
      <DataTable
        rows={sorted}
        columns={columns}
        rowKey={(p) => p.id}
        selectedKey={selectedId}
        onRowClick={onSelect}
        caption="Future programs"
        compact
        maxHeight="calc(100vh - 190px)"
        className="[&_table]:table-fixed"
      />
    </div>
  )
}
