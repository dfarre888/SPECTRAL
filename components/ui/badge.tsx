import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-[var(--store-accent-border)] text-[var(--store-accent)] bg-[var(--store-accent-glow)]',
        outline: 'border-[var(--store-line)] text-[var(--store-accent)] bg-transparent',
        confirmed: 'border-[rgba(74,222,128,0.25)] text-[var(--store-success)] bg-[rgba(74,222,128,0.10)]',
        assessed: 'border-amber/40 text-amber bg-amber/10',
        estimated: 'border-[var(--store-line)] store-text-muted store-panel-inner',
        reported: 'border-purple/40 text-purple bg-purple/10',
      },
    },
    defaultVariants: {
      variant: 'outline',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
