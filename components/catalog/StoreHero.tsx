import type { ReactNode } from 'react'
import { Sparkles, type LucideIcon } from 'lucide-react'
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
  /** Compact ops header — Command Center above the fold */
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
      <span
        className={cn(
          'inline-flex items-center gap-2 font-semibold rounded-full border border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]',
          compact ? 'text-[10px] px-2.5 py-1 mb-2' : 'text-xs px-3 py-1.5 mb-4',
        )}
      >
        {!compact ? <Sparkles size={12} /> : null}
        {eyebrow}
      </span>
      <h1
        className="store-display font-bold tracking-tight leading-tight text-white text-balance"
        style={{
          fontSize: compact ? 'clamp(20px, 2.4vw, 28px)' : 'clamp(28px, 3.6vw, 44px)',
          letterSpacing: '-0.03em',
        }}
      >
        {title}
      </h1>
      <p
        className={cn(
          'max-w-2xl store-text-body',
          compact ? 'mt-1.5 text-xs sm:text-sm' : 'mt-3 text-sm sm:text-base',
        )}
      >
        {subtitle}
      </p>
      {trustChip ? (
        <div
          className={cn(
            'inline-flex items-center gap-2.5 text-xs rounded-xl store-panel-inner store-text-body',
            compact ? 'mt-2 px-3 py-1.5' : 'mt-4 px-3.5 py-2.5',
          )}
        >
          {trustChip}
        </div>
      ) : null}
      {trustItems && trustItems.length > 0 ? (
        <div
          className={cn(
            'flex flex-wrap gap-x-4 gap-y-1 text-[10px] store-text-muted',
            compact ? 'mt-2' : 'mt-5 text-xs',
          )}
        >
          {trustItems.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon size={compact ? 12 : 14} className="text-[var(--store-accent)]" />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
