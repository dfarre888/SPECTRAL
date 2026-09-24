'use client'

import { useMemo, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import {
  LEGAL_NOTE,
  labelFor,
  payloadToInput,
  shortHash,
  type ActionTaken,
  type EvidenceInput,
  type VerifiedRecord,
} from '@/lib/base-protection/evidence'
import { DEFENCE_SITES, getSite } from '@/lib/base-protection/sites'
import { formatUtc } from '@/lib/base-protection/time'
import { EvidenceForm } from '@/components/base-protection/EvidenceForm'
import { EvidenceRecordView } from '@/components/base-protection/EvidenceRecordView'
import { IntegrityTag } from '@/components/base-protection/IntegrityTag'
import { Inspector } from '@/components/base-protection/Inspector'

export type EvidenceLoad =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; records: VerifiedRecord[]; storage: 'database' | 'memory' }

export type PaneMode =
  | { kind: 'none' }
  | { kind: 'record'; recordId: string }
  | { kind: 'new'; siteId: string }
  | { kind: 'amend'; record: VerifiedRecord; input: EvidenceInput }

const ACTION_TAG: Record<ActionTaken, string> = { observe: '', detect: 'blue', disable: 'amber', destroy: 'red' }

const COLUMNS: DataColumn<VerifiedRecord>[] = [
  {
    key: 'when',
    header: 'Occurred (UTC)',
    sticky: true,
    width: 176,
    sortValue: (r) => r.payload.occurred.utc,
    cell: (r) => (
      <div>
        <span className="primary block font-mono text-[12.5px]">{formatUtc(r.payload.occurred.utc)}</span>
        <span className="meta font-mono">
          {r.payload.occurred.local.slice(11)} local ({r.payload.occurred.utc_offset})
        </span>
      </div>
    ),
  },
  {
    key: 'site',
    header: 'Site',
    width: 150,
    sortValue: (r) => getSite(r.site_id)?.short ?? r.payload.site_name,
    cell: (r) => (
      <div className="min-w-0">
        <span className="block truncate text-[var(--store-ink)]">{getSite(r.site_id)?.short ?? r.payload.site_name}</span>
        <span className="meta">{r.is_exercise ? <span style={{ color: 'var(--bp-violet)' }}>Exercise</span> : 'Incident'}</span>
      </div>
    ),
  },
  {
    key: 'detection',
    header: 'Detection',
    width: 170,
    sortValue: (r) => r.payload.detection.method,
    className: 'clip',
    cell: (r) => (
      <div className="min-w-0">
        <span className="block">{labelFor.detection(r.payload.detection.method)}</span>
        <span className="meta truncate" title={r.payload.detection.sensor}>
          {r.payload.detection.sensor}
        </span>
      </div>
    ),
  },
  {
    key: 'drone',
    header: 'Drone',
    width: 190,
    className: 'clip',
    sortValue: (r) => r.payload.track.drone_type,
    cell: (r) => (
      <div className="min-w-0">
        <span className="block truncate" title={r.payload.track.drone_type}>
          {r.payload.track.drone_type}
        </span>
        <span className="meta font-mono">
          {r.payload.track.heading_deg != null ? `${String(r.payload.track.heading_deg).padStart(3, '0')}°` : 'hdg n/k'} ·{' '}
          {r.payload.track.altitude_m_agl != null ? `${r.payload.track.altitude_m_agl} m` : 'alt n/k'}
        </span>
      </div>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    width: 96,
    sortValue: (r) => ['observe', 'detect', 'disable', 'destroy'].indexOf(r.payload.action.taken),
    cell: (r) => <span className={`tag ${ACTION_TAG[r.payload.action.taken]}`}>{labelFor.action(r.payload.action.taken)}</span>,
  },
  {
    key: 'police',
    header: 'Police',
    width: 170,
    className: 'clip',
    sortValue: (r) => r.payload.police.agency,
    cell: (r) => (
      <div className="min-w-0">
        <span className="block truncate">{r.payload.police.agency || <span className="text-[var(--store-ink-mute)]">Not notified</span>}</span>
        <span className="meta truncate font-mono">{r.payload.police.reference || 'no reference'}</span>
      </div>
    ),
  },
  {
    key: 'ver',
    header: 'Ver',
    align: 'right',
    width: 58,
    sortValue: (r) => r.version,
    cell: (r) => `v${r.version}`,
  },
  {
    key: 'hash',
    header: 'SHA-384',
    width: 128,
    cell: (r) => (
      <span className="font-mono text-[12px] text-[var(--store-ink-soft)]" title={r.record_hash}>
        {shortHash(r.record_hash, 12)}
      </span>
    ),
  },
  {
    key: 'integrity',
    header: 'Integrity',
    width: 122,
    sortValue: (r) => r.integrity,
    cell: (r) => <IntegrityTag status={r.integrity} compact />,
  },
]

export function EvidenceLog({
  load,
  onReload,
  siteFilter,
  onSiteFilter,
  pane,
  onPane,
  onSaved,
  wide,
}: {
  wide: boolean | undefined
  load: EvidenceLoad
  onReload: () => void
  siteFilter: string
  onSiteFilter: (id: string) => void
  pane: PaneMode
  onPane: (p: PaneMode) => void
  onSaved: (record: VerifiedRecord, storage: 'database' | 'memory') => void
}) {
  const [showExercise, setShowExercise] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const records = load.kind === 'ready' ? load.records : []
  const rows = useMemo(
    () => records.filter((r) => (siteFilter === 'all' || r.site_id === siteFilter) && (showExercise || !r.is_exercise)),
    [records, siteFilter, showExercise],
  )
  const selectedRecord = pane.kind === 'record' ? records.find((r) => r.record_id === pane.recordId) ?? null : null
  const defaultSite = siteFilter !== 'all' ? siteFilter : 'raaf-williamtown'

  const paneContent = pane.kind === 'new' ? (
              <EvidenceForm
                key={`new-${pane.siteId}`}
                defaultSiteId={pane.siteId}
                onCancel={() => onPane({ kind: 'none' })}
                onSaved={(rec, storage) => {
                  onSaved(rec, storage)
                  onPane({ kind: 'record', recordId: rec.record_id })
                }}
              />
            ) : pane.kind === 'amend' ? (
              <EvidenceForm
                key={`amend-${pane.record.record_hash}`}
                defaultSiteId={pane.record.site_id}
                amend={pane.record}
                initial={pane.input}
                onCancel={() => onPane({ kind: 'record', recordId: pane.record.record_id })}
                onSaved={(rec, storage) => {
                  onSaved(rec, storage)
                  setRefreshKey((k) => k + 1)
                  onPane({ kind: 'record', recordId: rec.record_id })
                }}
              />
            ) : selectedRecord ? (
              <EvidenceRecordView
                key={selectedRecord.record_id}
                record={selectedRecord}
                refreshKey={refreshKey + selectedRecord.version}
                onAmend={(latest) => onPane({ kind: 'amend', record: latest, input: payloadToInput(latest.payload) })}
              />
            ) : (
              <div className="flex flex-col items-start gap-3 py-6">
                <FileText className="h-5 w-5 text-[var(--store-ink-mute)]" aria-hidden />
                <p className="text-[14px] font-medium text-[var(--store-ink)]">Select a record</p>
                <p className="text-[13px] leading-relaxed text-[var(--store-ink-soft)]">
                  Open a record to see every version, check its hash and export it for police. Or start a new incident report.
                </p>
              </div>
            )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="button" className="btn-glass primary !min-h-[44px] !px-5" onClick={() => onPane({ kind: 'new', siteId: defaultSite })}>
          <Plus className="h-4 w-4" aria-hidden />
          New incident report
        </button>
        <div className="flex items-center gap-2">
          <label htmlFor="bp-log-site" className="text-[12px] text-[var(--store-ink-soft)]">
            Site
          </label>
          <select
            id="bp-log-site"
            className="glass-field h-9 min-w-[220px] px-3 text-[13px]"
            value={siteFilter}
            onChange={(e) => onSiteFilter(e.target.value)}
          >
            <option value="all">All sites</option>
            {DEFENCE_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--store-ink-soft)]">
          <input
            type="checkbox"
            checked={showExercise}
            onChange={(e) => setShowExercise(e.target.checked)}
            className="h-4 w-4 accent-[var(--wb-blue)]"
          />
          Show exercise records
        </label>
      </div>
      <p className="mb-4 text-[12.5px] text-[var(--store-ink-soft)]">
        {LEGAL_NOTE} Records are append-only; each version is hashed with SHA-384 so a later change shows.
      </p>

      <div className={wide ? 'grid gap-5 grid-cols-[minmax(0,1fr)_440px]' : ''}>
        <div className="min-w-0">
          {load.kind === 'loading' ? (
            <div className="dt-frame motion-safe:animate-pulse" style={{ height: 360 }} aria-busy="true" aria-label="Loading the evidence log">
              <div className="h-11 border-b border-[var(--store-line)]" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="mx-4 mt-4 h-5 rounded bg-[rgba(255,255,255,0.04)]" />
              ))}
            </div>
          ) : load.kind === 'error' ? (
            <div className="dt-frame flex flex-col items-start gap-3 p-6">
              <p className="text-[13.5px] text-[var(--store-ink)]">The evidence log did not load.</p>
              <p className="text-[12.5px] text-[var(--store-ink-mute)]">{load.message}</p>
              <button type="button" className="btn-glass !min-h-[44px]" onClick={onReload}>
                Try again
              </button>
            </div>
          ) : (
            <DataTable
              rows={rows}
              columns={COLUMNS}
              rowKey={(r) => r.record_id}
              onRowClick={(r) => onPane({ kind: 'record', recordId: r.record_id })}
              selectedKey={pane.kind === 'record' ? pane.recordId : pane.kind === 'amend' ? pane.record.record_id : null}
              layout="fixed"
              compact
              minWidth={1260}
              defaultSort={{ key: 'when', dir: 'desc' }}
              maxHeight="calc(100vh - 300px)"
              caption="Counter-UXS evidence log"
              empty={
                records.length === 0
                  ? 'No incident reports yet. Use New incident report to log one.'
                  : 'No records match this filter.'
              }
            />
          )}
        </div>

        {wide ? (
          <aside
            className="store-panel sticky top-0 max-h-[calc(100vh-88px)] self-start overflow-y-auto rounded-2xl"
            aria-label="Record detail"
          >
            <div className="p-5">{paneContent}</div>
          </aside>
        ) : null}
      </div>
      {wide === false ? (
        <Inspector
          open={pane.kind !== 'none'}
          onClose={() => onPane({ kind: 'none' })}
          label={pane.kind === 'new' ? 'New incident report' : pane.kind === 'amend' ? 'Amend record' : 'Record detail'}
          focusKey={pane.kind === 'record' ? pane.recordId : pane.kind}
        >
          {paneContent}
        </Inspector>
      ) : null}
    </div>
  )
}
