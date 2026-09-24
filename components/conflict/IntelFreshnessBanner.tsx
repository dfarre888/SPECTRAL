import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { intelAge, type Freshness } from '@/lib/conflicts/intel-bundle'
import { scanBundles } from '@/lib/conflicts/latest-bundle'
import { formatKeyId, type SignatureState } from '@/lib/trust/bundle-signature'
import { WATCHFLOOR_NAME } from '@/lib/intel/watchfloor'

/**
 * Server component: it reads the bundle directory itself so the signature tag
 * always shows the state the loader actually enforced.
 */
interface IntelFreshnessBannerProps {
  /** ISO timestamp of the last imported bundle, or null if none. */
  lastImportAt: string | null
  producedBy?: string | null
  incidentCount?: number
}

/** Freshness is status, so it is a `.tag` colour on a hairline row, not a filled slab. */
const TONE: Record<Freshness, 'green' | 'amber' | 'red'> = {
  current: 'green',
  aging: 'amber',
  stale: 'amber',
  expired: 'red',
}

const DOT: Record<'green' | 'amber' | 'red', string> = {
  green: '#4ADE80',
  amber: '#FBBF24',
  red: 'var(--wb-red)',
}

const ADVICE: Record<Freshness, string> = {
  current: 'Within the expected import cadence.',
  aging: 'Past the daily cadence; consider a fresh import before briefing from this.',
  stale: 'Well past cadence. Absence of recent incidents here reflects import gaps, not quiet.',
  expired: 'Do not brief from this without a fresh import. Gaps are import gaps, not intelligence.',
}

/** Verified is the expected state, so it stays neutral; anything else is amber. */
const SIG_TAG: Record<Exclude<SignatureState, 'invalid'>, { tone: '' | 'amber'; text: string }> = {
  verified: { tone: '', text: 'Signed ML-DSA-87' },
  unverifiable: { tone: 'amber', text: 'Signature not checked' },
  unsigned: { tone: 'amber', text: 'Unsigned bundle' },
}

function SignatureTags() {
  const scan = scanBundles()
  const sig = scan.latest?.signature
  const tags: React.ReactNode[] = []
  if (sig && sig.state !== 'invalid') {
    const t = SIG_TAG[sig.state]
    const Icon = sig.state === 'verified' ? ShieldCheck : ShieldQuestion
    const title =
      `${WATCHFLOOR_NAME} bundle ${scan.latest!.file}. ${sig.reason}` +
      (sig.signedAt ? ` Signed ${sig.signedAt.slice(0, 16).replace('T', ' ')} UTC.` : '')
    tags.push(
      <a key="sig" href="/trust#watchfloor" className={`tag ${t.tone} no-underline`} title={title}>
        <Icon size={12} aria-hidden />
        {t.text}
        {sig.state === 'verified' && sig.keyId ? (
          <span className="font-mono store-text-muted">{formatKeyId(sig.keyId).slice(0, 9)}</span>
        ) : null}
      </a>,
    )
  }
  if (scan.rejected.length > 0) {
    const first = scan.rejected[0]
    tags.push(
      <a key="rej" href="/trust#watchfloor" className="tag red no-underline" title={`${first.file}: ${first.message}`}>
        <ShieldAlert size={12} aria-hidden />
        {scan.rejected.length === 1 ? '1 bundle rejected' : `${scan.rejected.length} bundles rejected`}
      </a>,
    )
  }
  return <>{tags}</>
}

export function IntelFreshnessBanner({
  lastImportAt,
  producedBy,
  incidentCount,
}: IntelFreshnessBannerProps) {
  if (!lastImportAt) {
    return (
      <div role="status" className="mt-5 mb-6 py-3 border-y fc-hair flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="tag red">
          <i className="h-1.5 w-1.5 rounded-full" style={{ background: DOT.red }} aria-hidden />
          No intel bundle imported
        </span>
        <SignatureTags />
        <span className="text-[12px] store-text-body">
          This instance has no egress. Incidents arrive by operator import; until then this
          timeline shows only what shipped with the build.
        </span>
      </div>
    )
  }

  const age = intelAge(lastImportAt)
  const tone = TONE[age.freshness]

  return (
    <div role="status" className="mt-5 mb-6 py-3 border-y fc-hair flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className={`tag ${tone}`}>
        <i className="h-1.5 w-1.5 rounded-full" style={{ background: DOT[tone] }} aria-hidden />
        {age.label}
      </span>
      <SignatureTags />
      <span className="text-[12px] font-mono store-text-muted tabular-nums">
        imported {new Date(lastImportAt).toISOString().slice(0, 10)}
        {producedBy ? ` · from ${producedBy}` : ''}
        {incidentCount != null ? ` · ${incidentCount} incidents` : ''}
      </span>
      <span className="text-[12px] store-text-body flex-1 min-w-[240px]">{ADVICE[age.freshness]}</span>
    </div>
  )
}
