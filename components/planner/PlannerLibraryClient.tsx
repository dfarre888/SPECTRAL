"use client";

import { useEffect, useState } from "react";
import { PlanCard } from "@/components/planner/PlanCard";
import type { BattlespacePlanRow } from "@/lib/planner/battlespace-plan";
import { StorePanel } from "@/components/ui/store-surface";

function PlansSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 mt-6">
      {[0, 1].map((i) => (
        <StorePanel key={i} className="p-4 animate-pulse space-y-3">
          <div className="h-4 w-2/3 rounded bg-[var(--store-surface-2)]" />
          <div className="h-3 w-full rounded bg-[var(--store-surface-2)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--store-surface-2)]" />
        </StorePanel>
      ))}
    </div>
  );
}

export function PlannerLibraryClient() {
  const [plans, setPlans] = useState<BattlespacePlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/plans")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setPlans(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PlansSkeleton />;
  if (!plans.length) {
    return (
      <StorePanel className="p-6 mt-6">
        <p className="text-sm font-mono store-text-muted">
          No saved plans yet — open{' '}
          <a href="/map" className="text-cyan hover:opacity-80">
            Map Intel
          </a>{' '}
          and save a laydown from the toolbar.
        </p>
      </StorePanel>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 mt-6">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}
