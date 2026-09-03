import { BmiIntelClient } from '@/components/bmi/BmiIntelClient'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { fetchBmiExercise } from '@/lib/bmi/bmi-queries'

export default async function BmiPage() {
  const bundle = await fetchBmiExercise('PITCH_BLACK_2026')

  return (
    <HubPageShell
      eyebrow="Coalition · PACE · OSINT"
      title="Battlespace Management — Pitch Black 2026"
      subtitle="Multinational comms interoperability, PACE planning, and spectrum deconfliction — OSINT only."
      headerAction={
        <div className="ring-gradient glass flex flex-wrap gap-2 rounded-xl px-3 py-2">
          <div className="text-center px-2">
            <div className="hero-number text-sm text-[#F7F9FC] tabular-nums">
              {bundle.meta.start_date}
            </div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">Start</div>
          </div>
          <div className="w-px bg-[var(--store-line)]" />
          <div className="text-center px-2">
            <div className="hero-number text-sm text-[#F7F9FC] tabular-nums">
              {bundle.meta.end_date}
            </div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">End</div>
          </div>
          <div className="w-px bg-[var(--store-line)]" />
          <div className="text-center px-2">
            <div className="hero-number text-lg text-[#F7F9FC]">{bundle.platforms.length}</div>
            <div className="text-[9px] uppercase tracking-wider store-text-muted">Platforms</div>
          </div>
        </div>
      }
    >
      <BmiIntelClient bundle={bundle} />
    </HubPageShell>
  )
}
