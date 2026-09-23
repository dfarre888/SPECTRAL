'use client'

/**
 * Callers: ForceCatalogClient (Force and By Nation tabs, Table view).
 * Purpose: the whole filtered catalogue as one sortable table. One scroller
 * sized to the viewport, sticky header, the leading column pinned on the left.
 * Row click (or Enter on the name) opens the detail pane.
 */

import { useMemo, type MouseEvent } from 'react'
import type { CatalogNation, ForceCatalogPlatformFull } from '@/lib/bmi/bmi-types'
import { tierForKind } from '@/lib/coalition/datalink-matrix'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { ConfidenceTag } from '@/components/force/ConfidenceTag'
import { EmptyState, SideDot } from '@/components/force-catalog/force-catalog-ui'
import { pretty } from '@/components/force-catalog/ForceCatalogFilters'

const TIER: Record<string, string> = {
  track: 'var(--wb-track)',
  data: 'var(--wb-data)',
  voice: 'var(--wb-voice)',
  none: 'var(--store-ink-faint)',
}
const CONF_RANK: Record<string, number> = { high: 0, medium: 1, classified: 2, estimated: 3 }
const TIER_RANK: Record<string, number> = { track: 0, data: 1, voice: 2, none: 3 }
const TIER_NAME: Record<string, string> = { track: 'Track', data: 'Data', voice: 'Voice', none: 'None' }
const STATUS_HUE: Record<string, string> = {
  in_service: 'text-[var(--store-ink)]',
  ordered: 'text-[#6CB8FF]',
  in_development: 'text-[#C4B5FD]',
  prototype: 'text-[#C4B5FD]',
  concept: 'store-text-muted',
  retiring: 'text-[#FCD34D]',
  retired: 'store-text-muted',
}

type Row = ForceCatalogPlatformFull

export function ForceCatalogTable({
  platforms,
  nationByCode,
  selectedId,
  onSelect,
  onClear,
  registerCardRef,
  byNation = false,
}: {
  platforms: Row[]
  nationByCode: Map<string, CatalogNation>
  selectedId: string | null
  onSelect: (p: Row) => void
  onClear: () => void
  registerCardRef?: (id: string, el: HTMLButtonElement | null) => void
  /** Lead with the nation column and sort by it (By Nation tab). */
  byNation?: boolean
}) {
  const columns = useMemo<DataColumn<Row>[]>(() => {
    const name: DataColumn<Row> = {
      key: 'name',
      header: 'Platform',
      width: byNation ? 210 : 230,
      sticky: !byNation,
      sortValue: (p) => p.short_name,
      cell: (p) => (
        <button
          type="button"
          ref={(el) => registerCardRef?.(p.id, el)}
          onClick={(e: MouseEvent) => {
            e.stopPropagation()
            onSelect(p)
          }}
          aria-pressed={selectedId === p.id}
          aria-label={selectedId === p.id ? `Close detail for ${p.short_name}` : `Open detail for ${p.short_name}`}
          className="flex w-full min-w-0 items-center gap-2.5 text-left"
        >
          <SideDot side={p.force_side} />
          <span className="min-w-0 flex-1">
            <span className="primary block truncate" title={p.short_name}>{p.short_name}</span>
            <span className="meta truncate font-mono" title={p.designation}>{p.designation}</span>
          </span>
        </button>
      ),
    }
    const nation: DataColumn<Row> = {
      key: 'nation',
      header: 'Nation',
      width: byNation ? 170 : 150,
      sticky: byNation,
      sortValue: (p) => `${p.nation_name} ${p.short_name}`,
      cell: (p) => {
        const region = nationByCode.get(p.nation_code)?.region
        return (
          <div className="min-w-0">
            <span className="block truncate font-mono text-[var(--store-ink)]">{p.nation_code}</span>
            <span className="meta truncate" title={region ? `${p.nation_name} · ${region}` : p.nation_name}>
              {p.nation_name}
            </span>
          </div>
        )
      },
    }
    const rest: DataColumn<Row>[] = [
      {
        key: 'role',
        header: 'Role',
        width: 140,
        sortValue: (p) => `${p.domain} ${p.role}`,
        cell: (p) => (
          <div className="min-w-0">
            <span className="block truncate" title={pretty(p.role)}>{pretty(p.role)}</span>
            <span className="meta truncate">{pretty(p.domain)}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: 116,
        sortValue: (p) => p.service_status,
        cell: (p) => (
          <span className={`block truncate ${STATUS_HUE[p.service_status] ?? ''}`}>{pretty(p.service_status)}</span>
        ),
      },
      {
        key: 'conf',
        header: 'Confidence',
        width: 104,
        sortValue: (p) => CONF_RANK[p.data_confidence] ?? 9,
        cell: (p) => <ConfidenceTag confidence={p.data_confidence} />,
      },
      {
        key: 'comms',
        header: 'Comms fit',
        width: 186,
        sortValue: (p) => p.comms.length,
        cell: (p) => {
          if (!p.comms.length) return <span className="store-text-muted">None listed</span>
          const labels = [...new Set(p.comms.map((c) => (c.standard && c.standard !== 'none' ? c.standard : c.label)))]
          const best = p.comms
            .map((c) => tierForKind(c.kind, c.standard))
            .sort((a, b) => (TIER_RANK[a] ?? 9) - (TIER_RANK[b] ?? 9))[0]
          return (
            <span className="flex min-w-0 items-center gap-2" title={`${TIER_NAME[best] ?? best} tier · ${labels.join(', ')}`}>
              <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TIER[best] }} aria-hidden />
              <span className="min-w-0 truncate font-mono text-[12px]">{labels.join(', ')}</span>
            </span>
          )
        },
      },
      {
        key: 'sensors',
        header: 'Sensors',
        width: 84,
        align: 'right',
        sortValue: (p) => p.sensors.length,
        cell: (p) =>
          p.sensors.length ? (
            <span className="text-[var(--store-ink)]">{p.sensors.length}</span>
          ) : (
            <span className="store-text-muted" title="No sensors in the open-source dossier (OSINT gap)">0</span>
          ),
      },
      {
        key: 'ioc',
        header: 'IOC',
        width: 66,
        align: 'right',
        sortValue: (p) => p.ioc_year,
        cell: (p) => (p.ioc_year != null ? p.ioc_year : null),
      },
    ]
    return byNation ? [nation, name, ...rest] : [name, nation, ...rest]
  }, [byNation, nationByCode, onSelect, registerCardRef, selectedId])

  if (platforms.length === 0) {
    return <EmptyState message="No platforms match the active filters." onClear={onClear} />
  }

  return (
    <DataTable
      key={byNation ? 'by-nation' : 'force'}
      rows={platforms}
      columns={columns}
      rowKey={(p) => p.id}
      selectedKey={selectedId}
      onRowClick={onSelect}
      defaultSort={byNation ? { key: 'nation', dir: 'asc' } : { key: 'name', dir: 'asc' }}
      caption="Force Catalogue platforms"
      compact
      maxHeight="calc(100vh - 170px)"
      className="[&_table]:table-fixed"
    />
  )
}
