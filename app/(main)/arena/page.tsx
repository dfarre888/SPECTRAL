import { ArenaWorkspace } from '@/components/arena/ArenaWorkspace'

export default function ArenaPage() {
  return (
    <div className="flex h-full min-h-0 flex-col -m-4 md:-m-6 lg:-m-8">
      <div className="shrink-0 border-b border-[var(--store-line)] bg-[var(--store-surface)] px-4 py-3 md:px-6">
        <p className="text-[11px] font-mono tracking-[0.02em] text-[var(--wb-blue)]">Wargaming</p>
        <h1 className="store-display text-lg font-semibold text-white mt-0.5">Red/Blue Arena</h1>
        <p className="text-xs store-text-body mt-1 max-w-3xl">
          WOPR live scenario engine — SSE COP, fog-of-war, time-stepped propagation. Training tier uses OSINT vignettes when Operations API unavailable.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6">
        <ArenaWorkspace />
      </div>
    </div>
  )
}
