'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Download, FilePenLine, Printer } from 'lucide-react'
import { LEGAL_NOTE, labelFor, shortHash, type EvidencePayload, type VerifiedRecord } from '@/lib/base-protection/evidence'
import { formatUtc } from '@/lib/base-protection/time'
import { IntegrityTag } from '@/components/base-protection/IntegrityTag'
import { PoliceExportSheet } from '@/components/base-protection/PoliceExportSheet'

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; versions: VerifiedRecord[] }

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[12px] text-[var(--store-ink-mute)]">{k}</dt>
      <dd className="min-w-0 text-[13px] text-[var(--store-ink-soft)]">{children}</dd>
    </>
  )
}

export function localWhen(p: EvidencePayload) {
  return `${p.occurred.local.replace('T', ' ')} (${p.occurred.utc_offset})`
}

export function EvidenceRecordView({
  record,
  onAmend,
  refreshKey,
}: {
  record: VerifiedRecord
  onAmend: (latest: VerifiedRecord) => void
  refreshKey: number
}) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [shown, setShown] = useState<number | null>(null)
  const [printing, setPrinting] = useState(false)

  const fetchChain = useCallback(async () => {
    setLoad({ kind: 'loading' })
    try {
      const res = await fetch(`/api/v1/base-protection/evidence/${encodeURIComponent(record.record_id)}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `Could not load the record (${res.status})`)
      setLoad({ kind: 'ready', versions: json.data as VerifiedRecord[] })
      setShown(null)
    } catch (e) {
      setLoad({ kind: 'error', message: e instanceof Error ? e.message : 'Could not load the record' })
    }
  }, [record.record_id])

  useEffect(() => {
    void fetchChain()
  }, [fetchChain, refreshKey])

  if (load.kind === 'loading') {
    return (
      <div className="flex flex-col gap-3 motion-safe:animate-pulse" aria-busy="true" aria-label="Loading record">
        <div className="h-6 w-2/3 rounded bg-[rgba(255,255,255,0.06)]" />
        <div className="h-4 w-1/2 rounded bg-[rgba(255,255,255,0.05)]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-[rgba(255,255,255,0.04)]" style={{ width: `${90 - (i % 3) * 15}%` }} />
        ))}
      </div>
    )
  }
  if (load.kind === 'error') {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[13px] text-[var(--store-ink-soft)]">{load.message}</p>
        <button type="button" className="btn-glass !min-h-[44px]" onClick={() => void fetchChain()}>
          Try again
        </button>
      </div>
    )
  }

  const versions = load.versions
  const latest = versions[versions.length - 1]
  const cur = versions.find((x) => x.version === shown) ?? latest
  const p = cur.payload

  return (
    <div className="flex flex-col gap-5">
      <header className="pr-10">
        <div className="flex flex-wrap items-center gap-2">
          {cur.is_exercise ? <span className="tag violet">Exercise record</span> : <span className="tag">Incident record</span>}
          <IntegrityTag status={cur.integrity} />
          <span className="font-mono text-[12px] text-[var(--store-ink-mute)]">
            v{cur.version} of {versions.length}
          </span>
        </div>
        <h2 className="mt-2.5 store-display text-[18px] font-semibold leading-tight tracking-[-0.01em] text-[var(--store-ink)]">
          {p.site_name}
        </h2>
        <p className="mt-1 font-mono text-[12.5px] text-[var(--store-ink-soft)]">
          {localWhen(p)} · {formatUtc(p.occurred.utc)}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-glass primary !min-h-[44px]" onClick={() => setPrinting(true)}>
          <Printer className="h-4 w-4" aria-hidden />
          Export for police
        </button>
        <a
          className="btn-glass !min-h-[44px]"
          href={`/api/v1/base-protection/evidence/${encodeURIComponent(cur.record_id)}/export`}
          download
        >
          <Download className="h-4 w-4" aria-hidden />
          JSON
        </a>
        <button
          type="button"
          className="btn-glass !min-h-[44px]"
          onClick={() => onAmend(latest)}
          disabled={latest.integrity !== 'verified'}
          title={latest.integrity !== 'verified' ? 'This record fails its integrity check and cannot be amended.' : undefined}
        >
          <FilePenLine className="h-4 w-4" aria-hidden />
          Amend
        </button>
      </div>

      <dl className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-2.5">
        <Row k="Detection">
          {labelFor.detection(p.detection.method)}. {p.detection.sensor}
        </Row>
        <Row k="Drone">{p.track.drone_type}</Row>
        <Row k="Heading, altitude">
          <span className="font-mono">
            {p.track.heading_deg != null ? `${String(p.track.heading_deg).padStart(3, '0')}°` : 'n/k'} ·{' '}
            {p.track.altitude_m_agl != null ? `${p.track.altitude_m_agl} m AGL` : 'n/k'}
          </span>
        </Row>
        <Row k="Track">{p.track.description}</Row>
        <Row k="Threat">
          <span className="text-[var(--store-ink)]">{labelFor.threat(p.threat.level)}</span>
          {p.threat.rationale ? `. ${p.threat.rationale}` : ''}
        </Row>
        <Row k="Action">
          <span className="text-[var(--store-ink)]">{labelFor.action(p.action.taken)}</span>
          {p.action.detail ? `. ${p.action.detail}` : ''}
        </Row>
        <Row k="Authorised by">{p.authorising_officer_role}</Row>
        <Row k="Police">
          {p.police.agency || 'Not notified'}
          {p.police.reference ? (
            <>
              {' '}
              · <span className="font-mono">{p.police.reference}</span>
            </>
          ) : null}
          {p.police.notified_local ? (
            <span className="block font-mono text-[12px] text-[var(--store-ink-mute)]">notified {p.police.notified_local.replace('T', ' ')} local</span>
          ) : null}
        </Row>
        <Row k="Evidence">
          {p.evidence_items.length === 0 ? (
            'None recorded'
          ) : (
            <ul className="flex flex-col gap-1.5">
              {p.evidence_items.map((e, i) => (
                <li key={i}>
                  {e.description}
                  <span className="block break-all font-mono text-[11.5px] text-[var(--store-ink-mute)]">
                    {e.algorithm} {e.checksum}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Row>
        {p.notes ? <Row k="Notes">{p.notes}</Row> : null}
        {p.amendment_reason ? <Row k="Amendment">{p.amendment_reason}</Row> : null}
      </dl>

      <section aria-labelledby="bp-int-h" className="border-t border-[var(--store-line)] pt-4">
        <h3 id="bp-int-h" className="wb-pane-title">
          Integrity
        </h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--store-ink-mute)]">
          SHA-384 of the record’s canonical JSON, checked again each time it loads. Each version points to the hash before it.
        </p>
        <ol className="mt-3 flex flex-col gap-1.5" aria-label="Versions">
          {versions.map((ver) => (
            <li key={ver.version}>
              <button
                type="button"
                onClick={() => setShown(ver.version)}
                aria-pressed={ver.version === cur.version}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)] aria-pressed:border-[rgba(41,151,255,0.45)] aria-pressed:bg-[rgba(41,151,255,0.08)] motion-reduce:transition-none"
              >
                <span className="w-7 font-mono text-[12.5px] text-[var(--store-ink)]">v{ver.version}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[12px] text-[var(--store-ink-soft)]" title={ver.record_hash}>
                    {shortHash(ver.record_hash, 24)}…
                  </span>
                  <span className="block font-mono text-[11.5px] text-[var(--store-ink-mute)]">
                    {formatUtc(ver.created_at)}
                    {ver.prev_hash ? ` · prev ${shortHash(ver.prev_hash, 8)}` : ' · first version'}
                  </span>
                </span>
                <IntegrityTag status={ver.integrity} compact />
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 break-all font-mono text-[11.5px] leading-relaxed text-[var(--store-ink-mute)]">
          <span className="text-[var(--store-ink-soft)]">v{cur.version} hash</span> {cur.record_hash}
        </p>
      </section>

      <p className="text-[11.5px] leading-relaxed text-[var(--store-ink-mute)]">{LEGAL_NOTE}</p>

      {printing ? <PoliceExportSheet versions={versions} onClose={() => setPrinting(false)} /> : null}
    </div>
  )
}
