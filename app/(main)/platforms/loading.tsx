import { PlatformGridSkeleton } from '@/components/platforms/PlatformGrid'

export default function PlatformsLoading() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 h-12 animate-pulse bg-surf1 rounded" />
      <PlatformGridSkeleton />
    </div>
  )
}
