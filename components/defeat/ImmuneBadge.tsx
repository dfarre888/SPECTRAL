import { cn } from '@/lib/utils'

interface ImmuneBadgeProps {
  className?: string
}

export function ImmuneBadge({ className }: ImmuneBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded border-2 border-red text-red font-mono text-[11px] font-bold tracking-[0.02em] bg-red/10',
        className
      )}
    >
      IMMUNE
    </span>
  )
}
