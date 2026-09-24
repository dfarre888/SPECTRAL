'use client'

import { useMemo } from 'react'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import {
  LAYERS,
  LAYER_LABEL,
  costLabel,
  formatPct,
  layerState,
  type Layer,
  type SiteAssessment,
} from '@/lib/base-protection/coverage'
import { KIND_LABEL, hasPublicCuas, publicIncidentCount, type DefenceSite } from '@/lib/base-protection/sites'
import { STATE_INK } from '@/components/base-protection/tokens'

export interface SiteRow {
  site: DefenceSite
  a: SiteAssessment
  logCount: number
  packageLabel: string
}

const NOT_PLANNED = (
  <span className="text-[var(--store-ink-mute)]" title="No package planned for this site">
    –
  </span>
)

function Pct({ row, layer }: { row: SiteRow; layer: Layer }) {
  if (!row.a.hasPackage) return NOT_PLANNED
  const f = row.a.layers[layer].fraction
  const st = layerState(f)
  return (
    <span className="font-mono tabular-nums" style={{ color: STATE_INK[st] }} title={`${LAYER_LABEL[layer]} covers ${formatPct(f)} of the protection circle`}>
      {formatPct(f)}
    </span>
  )
}

function Gap({ a }: { a: SiteAssessment }) {
  if (!a.hasPackage) return <span className="text-[var(--store-ink-mute)]">Not planned</span>
  if (a.uncovered.length === 0) return <span style={{ color: STATE_INK.full }}>Closed</span>
  if (a.uncovered.length === 3) {
    const anyNone = a.uncovered.some((l) => layerState(a.layers[l].fraction) === 'none')
    return (
      <span
        className="whitespace-nowrap"
        style={{ color: anyNone ? STATE_INK.none : STATE_INK.partial }}
        title={a.uncovered.map((l) => `${LAYER_LABEL[l]} ${formatPct(a.layers[l].fraction)}`).join(', ')}
      >
        All layers
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap">
      {a.uncovered.map((l, i) => (
        <span key={l} style={{ color: STATE_INK[layerState(a.layers[l].fraction)] }}>
          {i ? ', ' : ''}
          {LAYER_LABEL[l]}
        </span>
      ))}
    </span>
  )
}

const layerCol = (layer: Layer): DataColumn<SiteRow> => ({
  key: layer,
  header: LAYER_LABEL[layer],
  align: 'right',
  width: 72,
  sortValue: (r) => (r.a.hasPackage ? r.a.layers[layer].fraction : null),
  cell: (r) => <Pct row={r} layer={layer} />,
})

export function SitesTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: SiteRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const columns = useMemo<DataColumn<SiteRow>[]>(() => {
    const byKey: Record<string, DataColumn<SiteRow>> = {
      site: {
        key: 'site',
        header: 'Site',
        sticky: true,
        width: 176,
        sortValue: (r) => r.site.name,
        cell: (r) => (
          <div className="flex min-w-0 items-center gap-2" title={`${r.site.name}. ${KIND_LABEL[r.site.kind]}.`}>
            <span className="primary truncate">{r.site.short}</span>
            {hasPublicCuas(r.site) ? (
              <span className="tag blue shrink-0 !h-5 !px-1.5" title="C-UAS base protection trial publicly reported">
                Trial
              </span>
            ) : null}
          </div>
        ),
      },
      service: { key: 'service', header: 'Service', width: 76, sortValue: (r) => r.site.service, cell: (r) => r.site.service },
      state: { key: 'state', header: 'State', width: 62, sortValue: (r) => r.site.region, cell: (r) => r.site.region },
      reports: {
        key: 'reports',
        header: 'Reports',
        label: 'Public incident reports',
        align: 'right',
        width: 84,
        sortValue: (r) => publicIncidentCount(r.site),
        cell: (r) => {
          const n = publicIncidentCount(r.site)
          return (
            <span
              className={n ? 'text-[var(--store-ink)]' : 'text-[var(--store-ink-mute)]'}
              title={n ? `${n} incident${n === 1 ? '' : 's'} in public reporting` : 'No public reporting'}
            >
              {n}
            </span>
          )
        },
      },
      log: {
        key: 'log',
        header: 'Logged',
        label: 'Evidence log records',
        align: 'right',
        width: 80,
        sortValue: (r) => r.logCount,
        cell: (r) => <span className={r.logCount ? 'text-[var(--store-ink)]' : 'text-[var(--store-ink-mute)]'}>{r.logCount}</span>,
      },
      package: {
        key: 'package',
        header: 'Planned package',
        width: 210,
        sortValue: (r) => (r.a.hasPackage ? r.packageLabel : ''),
        className: 'clip',
        cell: (r) =>
          r.a.hasPackage ? (
            <span className="text-[var(--store-ink-soft)]" title={r.packageLabel}>
              {r.packageLabel}
            </span>
          ) : (
            <span className="text-[var(--store-ink-mute)]">None assigned</span>
          ),
      },
      gap: {
        key: 'gap',
        header: 'Gap',
        width: 124,
        sortValue: (r) => (r.a.hasPackage ? r.a.uncovered.length : null),
        cell: (r) => <Gap a={r.a} />,
      },
      cost: {
        key: 'cost',
        header: 'Cost to close',
        align: 'right',
        width: 150,
        sortValue: (r) => (r.a.cost.status === 'no_package' ? null : r.a.cost.totalUsd),
        cell: (r) =>
          !r.a.hasPackage ? (
            NOT_PLANNED
          ) : (
            <span
              className={r.a.cost.status === 'published' || r.a.cost.status === 'partial' ? 'text-[var(--store-ink)]' : 'text-[var(--store-ink-mute)]'}
            >
              {costLabel(r.a.cost)}
            </span>
          ),
      },
    }
    return [
      byKey.site,
      byKey.service,
      byKey.state,
      byKey.reports,
      ...LAYERS.map(layerCol),
      byKey.gap,
      byKey.cost,
      byKey.package,
      byKey.log,
    ]
  }, [])

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.site.id}
      onRowClick={(r) => onSelect(r.site.id)}
      selectedKey={selectedId}
      layout="fixed"
      minWidth={1200}
      caption="Defence sites with planned counter-drone coverage"
      empty="No sites match this filter."
    />
  )
}
