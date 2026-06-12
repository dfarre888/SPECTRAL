import { PlatformGridSkeleton } from '@/components/platforms/PlatformGrid'

export default function PlatformsLoading() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 h-12 animate-pulse bg-[var(--store-surface-2)] rounded-xl" />
      <PlatformGridSkeleton />
    </div>
  )
}
