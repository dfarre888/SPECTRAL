"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import type { BattlespacePlanRow } from "@/lib/planner/battlespace-plan";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { StorePanel } from "@/components/ui/store-surface";

const PHASE_LABEL: Record<string, string> = {
  plan: "Plan",
  rehearse: "Rehearse",
  archived: "Archived",
};

const PHASE_TAG: Record<string, string> = {
  plan: "tag blue",
  rehearse: "tag violet",
  archived: "tag",
};

function redCount(p: BattlespacePlanRow) {
  return p.laydown.uas?.length ?? 0;
}

function blueCount(p: BattlespacePlanRow) {
  return (p.laydown.cuas?.length ?? 0) + (p.laydown.radars?.length ?? 0) + (p.laydown.effectors?.length ?? 0);
}

const COLUMNS: DataColumn<BattlespacePlanRow>[] = [
  {
    key: "name",
    header: "Plan",
    sticky: true,
    sortValue: (p) => p.name,
    cell: (p) => (
      <span className="primary block max-w-[340px] truncate" title={p.name}>
        {p.name}
      </span>
    ),
  },
  {
    key: "phase",
    header: "Phase",
    width: 120,
    sortValue: (p) => p.phase,
    cell: (p) => <span className={PHASE_TAG[p.phase] ?? "tag"}>{PHASE_LABEL[p.phase] ?? p.phase}</span>,
  },
  {
    key: "red",
    header: "Red UAS",
    align: "right",
    headerClassName: "!text-right",
    width: 110,
    sortValue: redCount,
    cell: (p) => <span className="text-[var(--wb-red)]">{redCount(p)}</span>,
  },
  {
    key: "blue",
    header: "Blue assets",
    align: "right",
    headerClassName: "!text-right",
    width: 120,
    sortValue: blueCount,
    cell: (p) => <span className="text-[var(--wb-blue)]">{blueCount(p)}</span>,
  },
  {
    key: "updated",
    header: "Updated",
    align: "right",
    headerClassName: "!text-right",
    width: 140,
    sortValue: (p) => p.updated_at,
    cell: (p) => new Date(p.updated_at).toLocaleDateString(),
  },
  {
    key: "published",
    header: "Published to",
    width: 160,
    cell: (p) =>
      p.published_wopr_id || p.published_pcm_exercise_id ? (
        <span className="flex gap-3">
          {p.published_wopr_id && (
            <Link
              href={`/arena?scenario=${p.published_wopr_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] text-cyan hover:underline"
            >
              WOPR
            </Link>
          )}
          {p.published_pcm_exercise_id && (
            <Link
              href={`/pcm/exercise/${p.published_pcm_exercise_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] text-[#C4B5FD] hover:underline"
            >
              PCM
            </Link>
          )}
        </span>
      ) : (
        <span className="store-text-muted">Not published</span>
      ),
  },
  {
    key: "open",
    header: <span className="sr-only">Open</span>,
    align: "right",
    headerClassName: "!text-right",
    width: 130,
    cell: (p) => (
      <Link
        href={`/map?plan=${p.id}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 font-sans text-[13px] text-[var(--wb-blue)] hover:underline"
      >
        Open in Map
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    ),
  },
];

function PlansSkeleton() {
  return (
    <div className="dt-frame" aria-busy="true" aria-label="Loading saved plans">
      <div className="space-y-3 p-4 animate-pulse motion-reduce:animate-none">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-6">
            <div className="h-3.5 w-1/3 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-3.5 w-16 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="ml-auto h-3.5 w-24 rounded bg-[rgba(255,255,255,0.06)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlannerLibraryClient() {
  const router = useRouter();
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
      <StorePanel className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-[15px] font-medium text-[var(--store-ink)]">No saved plans yet</p>
          <p className="mt-1 text-[13px] store-text-body">
            Open Map Intel, place a laydown, and save it from the toolbar. It will appear here.
          </p>
        </div>
        <Link href="/map" className="btn-glass">
          Open Map Intel
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </StorePanel>
    );
  }
  return (
    <DataTable
      rows={plans}
      columns={COLUMNS}
      rowKey={(p) => p.id}
      onRowClick={(p) => router.push(`/map?plan=${p.id}`)}
      caption="Saved battlespace plans"
      maxHeight="calc(100vh - 200px)"
    />
  );
}
