'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Plane, Shield } from 'lucide-react'
import { resolvePlatformImagePath } from '@/lib/platforms/image-resolve'
import { cn } from '@/lib/utils'

const SIZE_PX = {
  xs: 28,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 76,
} as const

type ThumbnailSize = keyof typeof SIZE_PX | 'fill'

export type PlatformThumbnailVariant = 'uas' | 'cuas' | 'auto'

function platformInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function inferVariant(id: string, variant: PlatformThumbnailVariant): 'uas' | 'cuas' {
  if (variant !== 'auto') return variant
  if (
    id.startsWith('eff-') ||
    id.includes('ciws') ||
    id.includes('dome') ||
    id.includes('pulsar') ||
    id.includes('millennium') ||
    id.includes('phalanx') ||
    id.includes('goalkeeper')
  ) {
    return 'cuas'
  }
  return 'uas'
}

export interface PlatformThumbnailProps {
  id: string
  name: string
  size?: ThumbnailSize
  variant?: PlatformThumbnailVariant
  className?: string
  priority?: boolean
  rounded?: 'sm' | 'md' | 'lg' | 'none'
}

export function PlatformThumbnail({
  id,
  name,
  size = 'md',
  variant = 'auto',
  className,
  priority,
  rounded = 'md',
}: PlatformThumbnailProps) {
  const [failed, setFailed] = useState(false)
  const src = resolvePlatformImagePath(id)
  const showImage = Boolean(src && !failed)
  const px = size === 'fill' ? undefined : SIZE_PX[size]
  const resolvedVariant = inferVariant(id, variant)
  const FallbackIcon = resolvedVariant === 'cuas' ? Shield : Plane
  const roundedClass =
    rounded === 'none' ? '' : rounded === 'sm' ? 'rounded' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md'

  if (!showImage) {
    return (
      <div
        className={cn(
          'flex items-center justify-center flex-shrink-0 overflow-hidden',
          'bg-gradient-to-br from-[var(--store-surface-2)] to-[var(--store-surface)] border border-[var(--store-line)]',
          roundedClass,
          size === 'fill' && 'h-full w-full',
          className,
        )}
        style={px ? { width: px, height: px } : undefined}
        aria-label={`${name} — image unavailable`}
      >
        {px && px >= 36 ? (
          <span
            className="font-mono font-bold store-text-muted"
            style={{ fontSize: Math.max(8, Math.round(px * 0.28)) }}
          >
            {platformInitials(name)}
          </span>
        ) : (
          <FallbackIcon className={cn('store-text-muted', px && px < 32 ? 'h-3 w-3' : 'h-4 w-4')} />
        )}
      </div>
    )
  }

  if (size === 'fill') {
    return (
      <div className={cn('relative overflow-hidden', roundedClass, className)}>
        <Image
          src={src!}
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

  return (
    <div
      className={cn(
        'relative overflow-hidden flex-shrink-0 border border-[var(--store-line)] bg-[var(--store-surface-2)]',
        roundedClass,
        className,
      )}
      style={{ width: px, height: px }}
    >
      <Image
        src={src!}
        alt={name}
        fill
        sizes={`${px}px`}
        className="object-cover object-center"
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
