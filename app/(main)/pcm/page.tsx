import Link from 'next/link'
import { PCM_EYEBROW } from '@/lib/pcm/presentation-copy'
import { SHOWCASE_EXERCISE_ID } from '@/lib/pcm/showcase-exercise'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import { Crosshair, Swords, BarChart3 } from 'lucide-react'

export default function PcmHubPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title={PCM_EYEBROW}
      subtitle="Sovereign Persistent Combat Model — learner-driven scenarios, live globe, structured AAR, and force-design analysis."
      headerAction={
        <p className="text-[10px] font-mono store-text-muted">Date of information: Jul 2026</p>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/pcm/scenario"
          className="store-panel rounded-xl border border-[var(--store-line)] p-5 hover:border-[var(--store-accent-border)] transition-colors"
        >
          <Crosshair className="w-5 h-5 text-[var(--store-accent)] mb-3" />
          <h2 className="store-display font-semibold text-white text-sm">Scenario Generator</h2>
          <p className="text-xs store-text-muted mt-1">
            Generate DS/RPIC scenarios from competency blind spots, injects, and instructor focus points.
          </p>
        </Link>
        <Link
          href="/pcm/force-design"
          className="store-panel rounded-xl border border-[var(--store-line)] p-5 hover:border-[var(--store-accent-border)] transition-colors"
        >
          <BarChart3 className="w-5 h-5 text-cyan mb-3" />
          <h2 className="store-display font-semibold text-white text-sm">Force Design</h2>
          <p className="text-xs store-text-muted mt-1">Multi-run procurement analysis.</p>
        </Link>
        <Link
          href="/arena"
          className="store-panel rounded-xl border border-[var(--store-line)] p-5 hover:border-[var(--store-accent-border)] transition-colors"
        >
          <Swords className="w-5 h-5 text-red-400 mb-3" />
          <h2 className="store-display font-semibold text-white text-sm">WOPR Arena</h2>
          <p className="text-xs store-text-muted mt-1">Live SSE scenario engine — launch exercises from Arena or Scenario Generator.</p>
        </Link>
      </div>
      <StorePanel className="mt-6 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs store-text-body font-mono max-w-2xl">
          Start a PCM exercise from{' '}
          <Link href="/pcm/scenario" className="text-cyan hover:opacity-80">
            Scenario Generator
          </Link>{' '}
          — the exercise opens on the live globe when the run is published.
        </p>
        <Link
          href={`/pcm/exercise/${SHOWCASE_EXERCISE_ID}`}
          className="store-btn-secondary px-4 py-2 text-xs font-semibold shrink-0 text-center border border-[var(--store-line)] rounded-xl hover:border-[var(--store-accent-border)]"
        >
          Open active exercise
        </Link>
        <Link
          href="/pcm/scenario"
          className="store-btn-primary px-4 py-2 text-xs font-semibold shrink-0 text-center"
        >
          New exercise
        </Link>
      </StorePanel>
    </HubPageShell>
  )
}
