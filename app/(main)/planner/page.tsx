import Link from 'next/link';
import { HubPageShell } from '@/components/hub/HubPageShell';
import { PLANNER_VIGNETTES } from '@/lib/planner/vignettes';
import { PlannerLibraryClient } from '@/components/planner/PlannerLibraryClient';

export default function PlannerPage() {
  return (
    <HubPageShell
      eyebrow="SPECTRAL Planner"
      title="Battlespace plan library"
      subtitle="Persisted laydowns, vignette launcher, publish to WOPR/PCM."
      headerAction={
        <p className="text-[10px] font-mono store-text-muted">
          Date of information: Jul 2026 · {PLANNER_VIGNETTES.length} OSINT vignettes
        </p>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {PLANNER_VIGNETTES.map((v) => (
          <Link
            key={v.id}
            href={`/map?planVignette=${v.id}`}
            className="block store-panel rounded-xl border border-[var(--store-line)] p-4 hover:border-[var(--store-accent-border)] transition-colors"
          >
            <h3 className="text-sm font-semibold text-white store-display">{v.name}</h3>
            <p className="text-xs store-text-body mt-1">{v.description}</p>
            {v.swarmCount && (
              <p className="text-[10px] font-mono text-[var(--store-accent)] mt-2">
                {v.swarmCount}× threat swarm preset
              </p>
            )}
          </Link>
        ))}
      </div>
      <h2 className="text-sm font-semibold text-white mt-8 mb-2">Saved plans</h2>
      <PlannerLibraryClient />
    </HubPageShell>
  );
}
