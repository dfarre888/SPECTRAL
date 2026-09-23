import { cn } from '@/lib/utils'

interface ImmuneBadgeProps {
  className?: string
}

/** Status label: text plus hairline (.tag), never a filled slab. */
export function ImmuneBadge({ className }: ImmuneBadgeProps) {
  return <span className={cn('tag red', className)}>Immune</span>
}
