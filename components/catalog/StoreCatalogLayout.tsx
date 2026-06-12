import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StoreCatalogLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  className?: string
}

/** Left filter sidebar + main catalog grid (A3DM /store layout). */
export function StoreCatalogLayout({
  sidebar,
  children,
  className,
}: StoreCatalogLayoutProps) {
  return (
    <div
      className={cn(
        'relative z-10 grid items-start gap-4 lg:gap-8 pb-20',
        'lg:grid-cols-[clamp(220px,20vw,264px)_1fr]',
        className,
      )}
    >
      {sidebar}
      <section className="min-w-0">{children}</section>
    </div>
  )
}

interface StoreCatalogHeaderProps {
  title: string
  meta?: ReactNode
  action?: ReactNode
}

export function StoreCatalogHeader({ title, meta, action }: StoreCatalogHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
      <div>
        <h2
          className="store-display font-semibold text-xl text-white"
          style={{ letterSpacing: '-0.02em' }}
        >
          {title}
        </h2>
        {meta ? <div className="mt-1 text-xs font-mono store-text-muted">{meta}</div> : null}
      </div>
      {action}
    </div>
  )
}
