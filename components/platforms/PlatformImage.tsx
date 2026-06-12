'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Plane } from 'lucide-react'
import { platformImagePath } from '@/lib/platforms/image-catalog'
import { cn } from '@/lib/utils'

interface PlatformImageProps {
  id: string
  name: string
  className?: string
  priority?: boolean
}

export function PlatformImage({ id, name, className, priority }: PlatformImageProps) {
  const [failed, setFailed] = useState(false)
  const src = platformImagePath(id)

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center store-panel-inner',
          className,
        )}
        aria-label={`${name} — image unavailable`}
      >
        <Plane className="h-10 w-10 store-text-muted" />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden store-panel-inner', className)}>
      <Image
        src={src}
        alt={name}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover object-center"
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
