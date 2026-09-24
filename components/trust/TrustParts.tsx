/**
 * Building blocks for the Trust & Assurance page. Server-safe (no hooks).
 * Lacquer tables, hairline tags, no filled slabs (DESIGN.md).
 */
import type { ReactNode } from 'react'
import type { SignatureState } from '@/lib/trust/bundle-signature'

export type StatusKind = 'done' | 'partial' | 'gap' | 'hosting' | 'confirm' | 'info'

const STATUS: Record<StatusKind, { cls: string; text: string }> = {
  done: { cls: 'green', text: 'In place' },
  partial: { cls: 'amber', text: 'Partial' },
  gap: { cls: 'amber', text: 'Below target' },
  hosting: { cls: '', text: 'Customer hosting' },
  confirm: { cls: '', text: 'Customer to confirm' },
  info: { cls: '', text: 'Not a security control' },
}

export function Status({ kind, children }: { kind: StatusKind; children?: ReactNode }) {
  const s = STATUS[kind]
  return <span className={`tag ${s.cls}`}>{children ?? s.text}</span>
}

const SIG: Record<SignatureState, { cls: string; text: string }> = {
  verified: { cls: 'green', text: 'Verified' },
  unsigned: { cls: 'amber', text: 'Unsigned' },
  unverifiable: { cls: 'amber', text: 'Not checked' },
  invalid: { cls: 'red', text: 'Invalid' },
}

export function SignatureTag({ state, title }: { state: SignatureState; title?: string }) {
  const s = SIG[state]
  return (
    <span className={`tag ${s.cls}`} title={title}>
      {s.text}
    </span>
  )
}

export function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string
  title: string
  lede: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-14 scroll-mt-24">
      <h2
        id={`${id}-title`}
        className="text-[20px] store-display font-semibold tracking-[-0.015em] text-[var(--store-ink)] m-0"
      >
        {title}
      </h2>
      <p className="text-[13px] leading-[1.55] store-text-body mt-1.5 mb-5 max-w-[80ch] text-pretty">{lede}</p>
      {children}
    </section>
  )
}

export function Table({ head, children, caption }: { head: ReactNode[]; children: ReactNode; caption?: string }) {
  return (
    <div className="dt-frame">
      <div className="overflow-x-auto">
        <table className="dt">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export function SubHead({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3 id={id} className="wb-pane-title !text-[14px] mt-8 mb-3 scroll-mt-24">
      {children}
    </h3>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-[12px] leading-[1.55] store-text-muted mt-3 max-w-[90ch] text-pretty">{children}</p>
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[12px] text-[var(--store-ink-soft)]">{children}</code>
}

export function Mono({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="font-mono tabular-nums" title={title}>
      {children}
    </span>
  )
}

export function utc(iso: string | null | undefined): string {
  if (!iso) return 'not available'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'not available'
  return `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`
}
