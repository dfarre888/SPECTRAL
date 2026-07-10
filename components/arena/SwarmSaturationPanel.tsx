"use client";

import { useState } from "react";
import { SWARM_PRESETS, analyseSwarm } from "@/lib/planner/swarm-saturation";
import { StorePanel } from "@/components/ui/store-surface";

export function SwarmSaturationPanel() {
  const [presetId, setPresetId] = useState(SWARM_PRESETS[0]?.id ?? "");
  const preset = SWARM_PRESETS.find((p) => p.id === presetId) ?? SWARM_PRESETS[0];
  const result = preset ? analyseSwarm(preset) : null;

  return (
    <StorePanel className="p-4">
      <h3 className="text-xs font-semibold text-white uppercase mb-3">Swarm Saturation</h3>
      <select className="w-full text-xs font-mono store-panel-inner rounded-lg px-2 py-1.5 mb-3" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
        {SWARM_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {result && (
        <>
          <p className="text-sm font-mono text-cyan">{result.expectedKills} expected kills · leak {(result.leakThroughProbability * 100).toFixed(0)}%</p>
          <p className="text-[11px] store-text-body mt-2">{result.recommendation}</p>
        </>
      )}
    </StorePanel>
  );
}
