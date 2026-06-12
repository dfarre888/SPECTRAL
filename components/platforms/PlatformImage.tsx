'use client'

import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import { cn } from '@/lib/utils'

interface PlatformImageProps {
  id: string
  name: string
  className?: string
  priority?: boolean
}

export function PlatformImage({ id, name, className, priority }: PlatformImageProps) {
  return (
    <PlatformThumbnail
      id={id}
      name={name}
      size="fill"
      rounded="none"
      className={cn('store-panel-inner', className)}
      priority={priority}
    />
  )
}
