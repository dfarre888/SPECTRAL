import type { IntegrityStatus } from '@/lib/base-protection/evidence'

const TEXT: Record<IntegrityStatus, { label: string; short: string; cls: string; title: string }> = {
  verified: {
    label: 'Hash verified',
    short: 'Verified',
    cls: 'green',
    title: 'The stored hash re-derives from the record and links to the previous version.',
  },
  hash_mismatch: {
    label: 'Changed after saving',
    short: 'Changed',
    cls: 'red',
    title: 'The stored hash does not match the record. It was changed after it was saved.',
  },
  chain_broken: {
    label: 'Chain broken',
    short: 'Chain broken',
    cls: 'red',
    title: 'This version does not link to an intact previous version.',
  },
}

export function IntegrityTag({ status, compact }: { status: IntegrityStatus; compact?: boolean }) {
  const t = TEXT[status]
  return (
    <span className={`tag ${t.cls}`} title={t.title}>
      {compact ? t.short : t.label}
    </span>
  )
}
