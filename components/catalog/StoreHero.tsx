import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StoreTrustItem {
  icon: LucideIcon
  label: string
}

interface StoreHeroProps {
  eyebrow: string
  title: ReactNode
  subtitle: ReactNode
  trustChip?: ReactNode
  trustItems?: StoreTrustItem[]
  /** Compact ops header: Command Center above the fold */
  variant?: 'default' | 'compact'
  className?: string
}

/** A3DM Pro Shop–style hero block for Spectral catalog pages. */
export function StoreHero({
  eyebrow,
  title,
  subtitle,
  trustChip,
  trustItems,
  variant = 'default',
  className,
}: StoreHeroProps) {
  const compact = variant === 'compact'

  return (
    <section className={cn('relative z-10', compact ? 'pb-3' : 'pb-6', className)}>
      <span className="block text-[12px] mb-1.5 store-text-muted">{eyebrow}</span>
      <h1 className="page-title">{title}</h1>
      <p className="page-lede">{subtitle}</p>
      {trustChip ? (
        <div
          className={cn(
            'inline-flex items-center gap-2.5 text-[12px] rounded-full store-text-body border border-[var(--glass-line)] bg-[rgba(255,255,255,0.04)]',
            compact ? 'mt-3 px-3 py-1' : 'mt-4 px-3.5 py-1.5',
          )}
        >
          {trustChip}
        </div>
      ) : null}
      {trustItems && trustItems.length > 0 ? (
        <div
          className={cn(
            'flex flex-wrap gap-x-4 gap-y-1 text-[12px] store-text-muted',
            compact ? 'mt-2' : 'mt-4',
          )}
        >
          {trustItems.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon size={13} className="store-text-muted" />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
