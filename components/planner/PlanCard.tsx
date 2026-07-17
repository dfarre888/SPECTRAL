"use client";

import Link from "next/link";
import type { BattlespacePlanRow } from "@/lib/planner/battlespace-plan";
import { StorePanel } from "@/components/ui/store-surface";

export function PlanCard({ plan }: { plan: BattlespacePlanRow }) {
  const uas = plan.laydown.uas?.length ?? 0;
  const blue = (plan.laydown.cuas?.length ?? 0) + (plan.laydown.radars?.length ?? 0) + (plan.laydown.effectors?.length ?? 0);
  return (
    <StorePanel className="p-4 hover:border-[var(--store-accent-border)] transition-colors">
      <p className="text-[10px] font-mono store-text-muted">{plan.phase.toUpperCase()}</p>
      <h3 className="text-sm font-semibold text-white mt-1">{plan.name}</h3>
      <p className="text-[10px] font-mono text-cyan mt-2">{uas} red · {blue} blue assets</p>
      <p className="text-[10px] store-text-muted mt-1">Updated {new Date(plan.updated_at).toLocaleDateString()}</p>
      <div className="flex gap-2 mt-3">
        <Link href={`/map?plan=${plan.id}`} className="text-[10px] font-mono text-[var(--store-accent)] hover:underline">Open in Map</Link>
        {plan.published_wopr_id && (
          <Link href={`/arena?scenario=${plan.published_wopr_id}`} className="text-[10px] font-mono text-cyan hover:underline">WOPR</Link>
        )}
        {plan.published_pcm_exercise_id && (
          <Link href={`/pcm/exercise/${plan.published_pcm_exercise_id}`} className="text-[10px] font-mono text-purple hover:underline">PCM</Link>
        )}
      </div>
    </StorePanel>
  );
}
