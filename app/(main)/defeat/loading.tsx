export default function DefeatLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-10 w-64 bg-[var(--store-surface-2)] rounded-xl" />
      <div className="h-20 bg-[var(--store-surface-2)] rounded-xl" />
      <div className="h-96 bg-[var(--store-surface-2)] rounded-2xl border border-[var(--store-line)]" />
    </div>
  )
}
