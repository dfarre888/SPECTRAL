/** AFSIM laydown export stub — SPECTRAL_INTEROP_SIM=AFSIM */
import type { BattlespacePlanRow } from '@/lib/planner/battlespace-plan';

export interface AfsimExportBundle {
  format: 'AFSIM_LAYDOWN_V1';
  classification: string;
  planId: string;
  planName: string;
  exportedAt: string;
  entities: Array<{ id: string; type: string; side: 'red' | 'blue'; lat: number; lon: number; alt_m: number }>;
}

export function exportPlanToAfsim(plan: BattlespacePlanRow): AfsimExportBundle {
  const ld = plan.laydown;
  const entities = [
    ...ld.uas.map((u) => ({ id: u.instanceId, type: u.assetId, side: 'red' as const, lat: u.lat, lon: u.lon, alt_m: u.discAltitude_m })),
    ...ld.cuas.map((c) => ({ id: c.instanceId, type: c.assetId, side: 'blue' as const, lat: c.lat, lon: c.lon, alt_m: c.terrainAMSL })),
    ...ld.radars.map((r) => ({ id: r.instanceId, type: r.assetId, side: 'blue' as const, lat: r.lat, lon: r.lon, alt_m: r.terrainAMSL })),
    ...ld.effectors.map((e) => ({ id: e.instanceId, type: e.assetId, side: 'blue' as const, lat: e.lat, lon: e.lon, alt_m: e.terrainAMSL })),
  ];
  return {
    format: 'AFSIM_LAYDOWN_V1',
    classification: plan.classification,
    planId: plan.id,
    planName: plan.name,
    exportedAt: new Date().toISOString(),
    entities,
  };
}
