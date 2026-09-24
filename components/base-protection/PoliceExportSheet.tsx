'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Download, Printer, X } from 'lucide-react'
import { LEGAL_NOTE, labelFor, type VerifiedRecord } from '@/lib/base-protection/evidence'
import { getSite } from '@/lib/base-protection/sites'
import { formatUtc } from '@/lib/base-protection/time'

const BANNER = 'UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY'
const INTEGRITY_TEXT = { verified: 'Verified', hash_mismatch: 'Changed after saving', chain_broken: 'Chain broken' } as const

/** Print styles live here so the sheet prints alone, without app chrome. */
const PRINT_CSS = `
@media print {
  @page {
    size: A4;
    margin: 18mm 14mm 18mm 14mm;
    @top-center { content: "UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY"; font: 600 9pt 'JetBrains Mono', monospace; color: #18181b; }
    @bottom-center { content: "UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY"; font: 600 9pt 'JetBrains Mono', monospace; color: #18181b; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 9pt system-ui, sans-serif; color: #52525b; }
  }
  .bp-screen-only { display: none !important; }
  .bp-keep { break-inside: avoid; page-break-inside: avoid; }
  body * { visibility: hidden !important; }
  .bp-print-root, .bp-print-root * { visibility: visible !important; }
  .bp-print-root { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; background: #fff !important; overflow: visible !important; padding: 0 !important; }
  .bp-print-paper { box-shadow: none !important; border: 0 !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .bp-print-actions { display: none !important; }
}
`

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <tr className="align-top">
      <th scope="row" className="w-[32%] border-b border-[#d4d4d8] py-2 pr-4 text-left text-[12px] font-semibold text-[#3f3f46]">
        {k}
      </th>
      <td className="border-b border-[#d4d4d8] py-2 text-[12.5px] text-[#18181b]">{children}</td>
    </tr>
  )
}

/**
 * Printable hand-over sheet: plain black on white, classification top and
 * bottom, every version with its hash, and hand-over signature blocks.
 */
export function PoliceExportSheet({ versions, onClose }: { versions: VerifiedRecord[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const latest = versions[versions.length - 1]
  const p = latest.payload
  const site = getSite(p.site_id)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      // Keep Tab inside the dialog.
      if (e.key === 'Tab' && dialogRef.current) {
        const f = [...dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]')]
        if (f.length === 0) return
        const first = f[0]
        const last = f[f.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || active === dialogRef.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.({ preventScroll: true })
    }
  }, [])

  const mono = 'font-mono text-[11.5px]'

  return createPortal(
    <div
      className="bp-print-root fixed inset-x-0 bottom-0 top-[20px] z-[9998] overflow-y-auto bg-[rgba(0,0,0,0.84)] px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bp-print-h"
      ref={dialogRef}
      tabIndex={-1}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="bp-print-actions mx-auto mb-3 flex max-w-[820px] items-center justify-end gap-2">
        <button type="button" className="btn-glass primary !min-h-[44px]" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Print
        </button>
        <a className="btn-glass !min-h-[44px]" href={`/api/v1/base-protection/evidence/${encodeURIComponent(latest.record_id)}/export`} download>
          <Download className="h-4 w-4" aria-hidden />
          Download JSON
        </a>
        <button type="button" className="btn-glass !min-h-[44px]" onClick={onClose} aria-label="Close export">
          <X className="h-4 w-4" aria-hidden />
          Close
        </button>
      </div>

      <article className="bp-print-paper mx-auto max-w-[820px] rounded-lg bg-white px-10 py-8 text-[#18181b] shadow-2xl" style={{ fontFamily: 'var(--font-sans, system-ui)' }}>
        <p className="text-center font-mono text-[11.5px] font-semibold tracking-wide text-[#18181b]">{BANNER}</p>

        <header className="mt-5 border-b-2 border-[#18181b] pb-3">
          {latest.is_exercise ? (
            <p className="mb-2 inline-block border-2 border-[#18181b] px-2 py-0.5 font-mono text-[12px] font-bold tracking-wide">
              EXERCISE RECORD. NOT A REAL INCIDENT.
            </p>
          ) : null}
          <h1 id="bp-print-h" className="text-[22px] font-semibold leading-tight">
            Drone incident report for police
          </h1>
          <p className="mt-1 text-[12.5px] text-[#3f3f46]">
            {p.site_name} · {p.occurred.local.replace('T', ' ')} local ({p.occurred.utc_offset}) · {formatUtc(p.occurred.utc)}
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-[#52525b]">{LEGAL_NOTE}</p>
        </header>

        <table className="mt-4 w-full border-collapse">
          <tbody>
            <Row k="Record ID">
              <span className={mono}>{latest.record_id}</span>
            </Row>
            <Row k="Version">
              {latest.version} of {versions.length}
            </Row>
            <Row k="Site">
              {p.site_name}
              {site ? (
                <span className={`block ${mono} text-[#52525b]`}>
                  {site.lat.toFixed(4)}, {site.lon.toFixed(4)} · {site.timeZone}
                </span>
              ) : null}
            </Row>
            <Row k="Date and time">
              <span className={mono}>
                {p.occurred.local.replace('T', ' ')} local, UTC offset {p.occurred.utc_offset}
                <br />
                {p.occurred.utc}
              </span>
            </Row>
            <Row k="Detection">
              {labelFor.detection(p.detection.method)}. Sensor or observer: {p.detection.sensor}
            </Row>
            <Row k="Track">
              <span className={mono}>
                Heading {p.track.heading_deg != null ? `${String(p.track.heading_deg).padStart(3, '0')} deg` : 'not known'}, altitude{' '}
                {p.track.altitude_m_agl != null ? `${p.track.altitude_m_agl} m AGL` : 'not known'}
              </span>
              <br />
              Type: {p.track.drone_type}
              <br />
              {p.track.description}
            </Row>
            <Row k="Threat assessment">
              {labelFor.threat(p.threat.level)}
              {p.threat.rationale ? `. ${p.threat.rationale}` : ''}
            </Row>
            <Row k="Action taken">
              {labelFor.action(p.action.taken)}
              {p.action.detail ? `. ${p.action.detail}` : ''}
            </Row>
            <Row k="Authorising officer">{p.authorising_officer_role}</Row>
            <Row k="Police agency">
              {p.police.agency || 'Not recorded'}
              {p.police.reference ? (
                <>
                  , reference <span className={mono}>{p.police.reference}</span>
                </>
              ) : null}
              {p.police.notified_local ? <span className={`block ${mono}`}>Notified {p.police.notified_local.replace('T', ' ')} local</span> : null}
            </Row>
            <Row k="Evidence items">
              {p.evidence_items.length === 0 ? (
                'None recorded'
              ) : (
                <ol className="list-decimal pl-4">
                  {p.evidence_items.map((e, i) => (
                    <li key={i} className="mb-1">
                      {e.description}
                      <span className={`block break-all ${mono} text-[#3f3f46]`}>
                        {e.algorithm}: {e.checksum}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Row>
            {p.notes ? <Row k="Notes">{p.notes}</Row> : null}
          </tbody>
        </table>

        <h2 className="bp-keep mt-6 text-[14px] font-semibold">Record integrity</h2>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#3f3f46]">
          Each version is hashed with SHA-384 over the canonical JSON of its record ID, version, previous hash, created time and
          content (object keys sorted, no whitespace). A later version names the hash of the one before it, so a change to any
          earlier version breaks the chain. The JSON download carries everything needed to re-derive these hashes.
        </p>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#18181b]">
              <th className="py-1.5 pr-3 text-[11.5px] font-semibold">Ver</th>
              <th className="py-1.5 pr-3 text-[11.5px] font-semibold">Saved (UTC)</th>
              <th className="py-1.5 pr-3 text-[11.5px] font-semibold">SHA-384</th>
              <th className="py-1.5 text-[11.5px] font-semibold">Check</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((ver) => (
              <tr key={ver.version} className="align-top border-b border-[#d4d4d8]">
                <td className={`py-1.5 pr-3 ${mono}`}>{ver.version}</td>
                <td className={`py-1.5 pr-3 ${mono} whitespace-nowrap`}>{formatUtc(ver.created_at)}</td>
                <td className={`py-1.5 pr-3 ${mono} break-all`}>
                  {ver.record_hash}
                  {ver.payload.amendment_reason ? (
                    <span className="block font-sans text-[11.5px] text-[#3f3f46]">Amendment: {ver.payload.amendment_reason}</span>
                  ) : null}
                </td>
                <td className="py-1.5 text-[11.5px]">{INTEGRITY_TEXT[ver.integrity]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bp-keep mt-7 grid grid-cols-2 gap-8 text-[12px]">
          {['Handed over by (appointment)', 'Received by (police officer and agency)'].map((l) => (
            <div key={l}>
              <p className="font-semibold">{l}</p>
              <div className="mt-8 border-b border-[#18181b]" />
              <p className="mt-1 text-[11.5px] text-[#52525b]">Signature, date and time</p>
            </div>
          ))}
        </div>

        <p className="bp-screen-only mt-8 text-center font-mono text-[11.5px] font-semibold tracking-wide">{BANNER}</p>
      </article>
    </div>,
    document.body,
  )
}
