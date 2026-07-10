/** LMS / xAPI bundle metadata stub for Milskil partners */
import type { BattlespacePlanRow } from '@/lib/planner/battlespace-plan';

export interface LmsExportBundle {
  format: 'SPECTRAL_LMS_V1';
  xapiActivityId: string;
  title: string;
  description: string;
  classification: string;
  vignetteId: string | null;
  exportedAt: string;
}

export function exportPlanToLms(plan: BattlespacePlanRow): LmsExportBundle {
  return {
    format: 'SPECTRAL_LMS_V1',
    xapiActivityId: `https://spectral.a3dm.io/plans/${plan.id}`,
    title: plan.name,
    description: 'SPECTRAL Planner laydown — Map Intel COP export for course integration.',
    classification: plan.classification,
    vignetteId: plan.vignette_id,
    exportedAt: new Date().toISOString(),
  };
}
