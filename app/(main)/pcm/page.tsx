import Link from 'next/link'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { Crosshair, Swords, BarChart3 } from 'lucide-react'

export default function PcmHubPage() {
  return (
    <HubPageShell
      eyebrow="Wargaming"
      title="PCM Training"
      subtitle="Sovereign Persistent Combat Model — learner-driven scenarios, live globe, structured AAR, and force-design analysis."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/pcm/scenario" className="store-panel rounded-xl border border-[var(--store-line)] p-5 hover:border-[var(--store-accent)]/40 transition-colors">
          <Crosshair className="w-5 h-5 text-[var(--store-accent)] mb-3" />
          <h2 className="store-display font-semibold text-white text-sm">Scenario Generator</h2>
          <p className="text-xs store-text-muted mt-1">AI-configured exercises from trainee blind spots.</p>
        </Link>
        <Link href="/pcm/force-design" className="store-panel rounded-xl border border-[var(--store-line)] p-5 hover:border-[var(--store-accent)]/40 transition-colors">
          <BarChart3 className="w-5 h-5 text-cyan mb-3" />
          <h2 className="store-display font-semibold text-white text-sm">Force Design</h2>
          <p className="text-xs store-text-muted mt-1">Multi-run procurement analysis.</p>
        </Link>
        <Link href="/arena" className="store-panel rounded-xl border border-[var(--store-line)] p-5 hover:border-[var(--store-accent)]/40 transition-colors">
          <Swords className="w-5 h-5 text-purple mb-3" />
          <h2 className="store-display font-semibold text-white text-sm">WOPR Arena</h2>
          <p className="text-xs store-text-muted mt-1">Live SSE scenario engine.</p>
        </Link>
      </div>
    </HubPageShell>
  )
}
