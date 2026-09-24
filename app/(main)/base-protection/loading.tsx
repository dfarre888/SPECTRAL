export default function BaseProtectionLoading() {
  // Same footprint as the loaded page so nothing jumps when data arrives.
  return (
    <div className="w-full max-w-[112rem] mx-auto motion-safe:animate-pulse" aria-busy="true" aria-label="Loading base protection">
      <div className="h-9 w-64 rounded-lg bg-[rgba(255,255,255,0.06)]" />
      <div className="mt-3 h-4 w-[min(640px,90%)] rounded bg-[rgba(255,255,255,0.05)]" />
      <div className="mt-2 h-4 w-[min(420px,70%)] rounded bg-[rgba(255,255,255,0.05)]" />
      <div className="mt-6 h-[104px] border-y fc-hair" />
      <div className="mt-6 h-9 w-80 rounded-xl bg-[rgba(255,255,255,0.05)]" />
      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="dt-frame" style={{ height: 'max(420px, calc(100vh - 360px))' }} />
        <div className="store-panel hidden rounded-2xl xl:block" style={{ height: 'max(420px, calc(100vh - 360px))' }} />
      </div>
    </div>
  )
}
