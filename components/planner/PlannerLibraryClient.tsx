"use client";

import { useEffect, useState } from "react";
import { PlanCard } from "@/components/planner/PlanCard";
import type { BattlespacePlanRow } from "@/lib/planner/battlespace-plan";

export function PlannerLibraryClient() {
  const [plans, setPlans] = useState<BattlespacePlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/plans")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setPlans(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm font-mono store-text-muted">Loading plans…</p>;
  if (!plans.length) return <p className="text-sm font-mono store-text-muted">No saved plans yet — open Map Intel and Save.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2 mt-6">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}
