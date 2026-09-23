import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px] font-medium disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'btn-glass primary',
        outline: 'btn-glass',
        ghost: 'rounded-[10px] px-3 store-text-body hover:bg-[rgba(255,255,255,0.07)] hover:text-[var(--store-ink)] transition-colors',
      },
      size: {
        default: 'h-9 px-4',
        sm: '!min-h-[30px] h-[30px] px-3 !text-[12px]',
        icon: 'h-8 w-8 !px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
