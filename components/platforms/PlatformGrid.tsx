import { Plane } from 'lucide-react'
import { PlatformCard } from '@/components/platforms/PlatformCard'
import type { Platform } from '@/lib/types'

interface PlatformGridProps {
  platforms: Platform[]
}

export function PlatformGrid({ platforms }: PlatformGridProps) {
  if (platforms.length === 0) {
    return (
      <div className="store-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <Plane className="h-10 w-10 store-text-muted mb-4 opacity-40" />
        <p className="font-semibold text-lg text-white mb-1">No platforms match</p>
        <p className="text-sm store-text-body">
          Try a different category or clear the search.
        </p>
      </div>
    )
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
    >
      {platforms.map((platform, index) => (
        <PlatformCard key={platform.id} platform={platform} index={index} />
      ))}
    </div>
  )
}

export function PlatformGridSkeleton() {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] store-panel rounded-2xl animate-pulse"
        />
      ))}
    </div>
  )
}
