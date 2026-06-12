import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-cyan/40 text-cyan bg-cyan/10',
        outline: 'border-cyan/40 text-cyan bg-transparent',
        confirmed: 'border-green/40 text-green bg-green/10',
        assessed: 'border-amber/40 text-amber bg-amber/10',
        estimated: 'border-t-muted text-t-muted bg-surf2',
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
