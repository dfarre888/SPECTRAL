import { PlatformGridSkeleton } from '@/components/platforms/PlatformGrid'

export default function PlatformsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading Platform Library">
      <h1 className="page-title">Platform Library</h1>
      <div className="mt-3 h-5 w-[min(560px,100%)] rounded-md store-panel animate-pulse" />
      <div className="mt-8">
        <PlatformGridSkeleton />
      </div>
    </div>
  )
}
