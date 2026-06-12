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
  className?: string
}

/** A3DM Pro Shop–style hero block for Spectral catalog pages. */
export function StoreHero({
  eyebrow,
  title,
  subtitle,
  trustChip,
  trustItems,
  className,
}: StoreHeroProps) {
  return (
    <section className={cn('relative z-10 pb-6', className)}>
      <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]">
        <Sparkles size={12} />
        {eyebrow}
      </span>
      <h1
        className="store-display font-bold tracking-tight leading-none text-white text-balance"
        style={{
          fontSize: 'clamp(28px, 3.6vw, 44px)',
          letterSpacing: '-0.03em',
        }}
      >
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm sm:text-base store-text-body">{subtitle}</p>
      {trustChip ? (
        <div className="mt-4 inline-flex items-center gap-2.5 text-xs px-3.5 py-2.5 rounded-xl store-panel-inner store-text-body">
          {trustChip}
        </div>
      ) : null}
      {trustItems && trustItems.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-4 text-xs store-text-muted">
          {trustItems.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon size={14} className="text-[var(--store-accent)]" />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
