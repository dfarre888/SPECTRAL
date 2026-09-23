export default function DefeatLoading() {
  // Same footprint as the loaded page (title, instruments, toolbar, docked
  // matrix frame) so nothing jumps when the data arrives.
  return (
    <div className="w-full motion-safe:animate-pulse" aria-busy="true" aria-label="Loading defeat matrix">
      <div className="h-9 w-56 rounded-lg bg-[rgba(255,255,255,0.06)]" />
      <div className="mt-3 h-4 w-[min(640px,90%)] rounded bg-[rgba(255,255,255,0.05)]" />
      <div className="mt-2 h-4 w-[min(480px,70%)] rounded bg-[rgba(255,255,255,0.05)]" />
      <div className="mt-6 h-[104px] border-b fc-hair" />
      <div className="mt-5 h-8 w-72 rounded-xl bg-[rgba(255,255,255,0.05)]" />
      <div className="dt-frame mt-3" style={{ height: 'max(440px, calc(100vh - 216px))' }} />
    </div>
  )
}
