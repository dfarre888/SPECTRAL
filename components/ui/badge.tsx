import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'tag',
  {
    variants: {
      variant: {
        default: 'blue',
        outline: '',
        confirmed: 'green',
        assessed: 'amber',
        estimated: '',
        reported: 'violet',
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
