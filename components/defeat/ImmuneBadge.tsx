import { cn } from '@/lib/utils'

interface ImmuneBadgeProps {
  className?: string
}

export function ImmuneBadge({ className }: ImmuneBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded border-2 border-red text-red font-mono text-[10px] font-bold uppercase tracking-wider bg-red/10',
        className
      )}
    >
      IMMUNE
    </span>
  )
}
