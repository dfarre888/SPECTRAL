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
    >
      <div className="grid gap-4 md:grid-cols-2">
        {PLANNER_VIGNETTES.map((v) => (
          <Link
            key={v.id}
            href={`/map?planVignette=${v.id}`}
            className="block rounded-xl border border-[var(--store-line)] bg-black/30 p-4 hover:border-cyan/40 transition-colors"
          >
            <h3 className="text-sm font-semibold text-white">{v.name}</h3>
            <p className="text-xs text-zinc-400 mt-1">{v.description}</p>
            {v.swarmCount && <p className="text-[10px] font-mono text-orange mt-2">{v.swarmCount}× threat swarm preset</p>}
          </Link>
        ))}
      </div>
      <h2 className="text-sm font-semibold text-white mt-8 mb-2">Saved plans</h2>
      <PlannerLibraryClient />
    </HubPageShell>
  );
}
