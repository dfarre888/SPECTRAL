"use client";

import type { PlacedUas } from "@/lib/map/types";

interface EmconTimelineProps {
  placedUas: PlacedUas[];
}

export function EmconTimeline({ placedUas }: EmconTimelineProps) {
  const withMission = placedUas.filter((u) => u.mission);
  if (!withMission.length) {
    return <p className="text-[11px] store-text-muted">No mission paths with EMCON state.</p>;
  }

  return (
    <div className="space-y-2">
      {withMission.map((u) => (
        <div key={u.instanceId} className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-white w-24 truncate">{u.asset.name}</span>
          <div className="flex-1 h-4 rounded bg-[var(--store-surface-2)] relative overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 ${u.mission?.emcon ? "bg-cyan/40" : "bg-[var(--store-accent)]/40"}`}
              style={{ width: "100%" }}
              title={u.mission?.emcon ? "EMCON — radiate silent" : "Radiating"}
            />
          </div>
          <span className={u.mission?.emcon ? "text-cyan" : "text-[var(--store-accent)]"}>
            {u.mission?.emcon ? "EMCON" : "RAD"}
          </span>
        </div>
      ))}
    </div>
  );
}
