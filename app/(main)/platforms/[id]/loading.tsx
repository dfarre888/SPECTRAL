export default function PlatformDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse space-y-6">
      <div className="h-8 w-48 bg-[var(--store-surface-2)] rounded-xl" />
      <div className="h-12 w-96 bg-[var(--store-surface-2)] rounded-xl" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-[600px] bg-[var(--store-surface-2)] rounded-2xl" />
        <div className="h-[400px] bg-[var(--store-surface-2)] rounded-2xl" />
      </div>
    </div>
  )
}
