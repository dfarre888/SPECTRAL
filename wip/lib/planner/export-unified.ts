/**
 * SPECTRAL Unified Export Bundle v1
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */
import type { BmiInteropExportBundle } from '@/lib/bmi/interop-export';
import { BMI_INTEROP_EXPORT_VERSION } from '@/lib/bmi/interop-export';
import type { PacePlan } from '@/lib/bmi/bmi-types';
import {
  ensurePlanDocumentV2,
  type BattlespacePlanRow,
  type EconomicsScenarioRef,
  type MapLaydownDocumentV2,
} from '@/lib/planner/battlespace-plan';
import { exportPlanToAfsim, type AfsimExportBundle } from '@/lib/planner/export-afsim';

export const UNIFIED_EXPORT_SCHEMA = 'SPECTRAL_UNIFIED_V1' as const;

export interface UnifiedExportBundle {
  schema: typeof UNIFIED_EXPORT_SCHEMA;
  classification: string;
  planId: string;
  planName: string;
  exportedAt: string;
  laydown: AfsimExportBundle;
  afsim: AfsimExportBundle;
  interop: BmiInteropExportBundle | null;
  economics: {
    scenarios: EconomicsScenarioRef[];
    exchange_targets: number[];
    note: string;
  };
  plan_document: {
    version: number;
    coalition?: MapLaydownDocumentV2['coalition'];
    comms?: MapLaydownDocumentV2['comms'];
    airspace?: MapLaydownDocumentV2['airspace'];
    readiness?: MapLaydownDocumentV2['readiness'];
    red_force?: MapLaydownDocumentV2['red_force'];
  };
  metadata: {
    accredited_data_included: false;
    note: string;
  };
}

const ECONOMICS_NOTE =
  'OSINT engagement economics only — accredited Pk / ERP / waveform data intentionally excluded';

const METADATA_NOTE =
  'Training-tier unified export — no accredited_defeat_pk, ERP profiles, or waveform tables';

function mergeEconomicsScenarios(
  planScenarios: EconomicsScenarioRef[],
  laydownScenarios: EconomicsScenarioRef[],
): EconomicsScenarioRef[] {
  const byId = new Map<string, EconomicsScenarioRef>();
  for (const row of [...planScenarios, ...laydownScenarios]) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

function buildInteropSummary(laydown: MapLaydownDocumentV2): BmiInteropExportBundle | null {
  const { comms, coalition } = laydown;
  const hasComms =
    comms.gateway_nodes.length > 0 ||
    comms.pace_plans.length > 0 ||
    (comms.interop_graph_ref !== null && comms.interop_graph_ref !== undefined);

  if (!hasComms) return null;

  return {
    version: BMI_INTEROP_EXPORT_VERSION,
    exercise_id: coalition.exercise_id ?? 'unknown',
    graph_summary: {
      link_count: 0,
      gateway_dependent: [...comms.gateway_nodes],
      isolated_pair_count: 0,
    },
    pace_plans: comms.pace_plans as PacePlan[],
    note: 'Summary from plan laydown comms — no live interop graph attached',
  };
}

export function unifiedExportSections(bundle: UnifiedExportBundle): string[] {
  const sections = ['laydown', 'afsim', 'economics', 'plan_document', 'metadata'];
  if (bundle.interop) sections.push('interop');
  return sections;
}

export function buildUnifiedExport(
  plan: BattlespacePlanRow,
  options?: { interop?: BmiInteropExportBundle | null },
): UnifiedExportBundle {
  const laydownDoc = ensurePlanDocumentV2(plan.laydown);
  const afsim = exportPlanToAfsim({ ...plan, laydown: laydownDoc });
  const interop = options?.interop !== undefined ? options.interop : buildInteropSummary(laydownDoc);

  return {
    schema: UNIFIED_EXPORT_SCHEMA,
    classification: plan.classification,
    planId: plan.id,
    planName: plan.name,
    exportedAt: new Date().toISOString(),
    laydown: afsim,
    afsim,
    interop,
    economics: {
      scenarios: mergeEconomicsScenarios(plan.economics_scenarios ?? [], laydownDoc.economics.scenarios),
      exchange_targets: [...new Set([...laydownDoc.economics.exchange_targets])],
      note: ECONOMICS_NOTE,
    },
    plan_document: {
      version: laydownDoc.version,
      coalition: laydownDoc.coalition,
      comms: laydownDoc.comms,
      airspace: laydownDoc.airspace,
      readiness: laydownDoc.readiness,
      red_force: laydownDoc.red_force,
    },
    metadata: {
      accredited_data_included: false,
      note: METADATA_NOTE,
    },
  };
}

export function validateUnifiedExport(
  bundle: unknown,
): { ok: true; bundle: UnifiedExportBundle } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!bundle || typeof bundle !== 'object') {
    return { ok: false, errors: ['bundle must be an object'] };
  }
  const b = bundle as Record<string, unknown>;

  if (b.schema !== UNIFIED_EXPORT_SCHEMA) errors.push(`schema must be ${UNIFIED_EXPORT_SCHEMA}`);
  if (typeof b.classification !== 'string' || !b.classification) errors.push('classification required');
  if (typeof b.planId !== 'string') errors.push('planId required');
  if (typeof b.planName !== 'string') errors.push('planName required');
  if (typeof b.exportedAt !== 'string') errors.push('exportedAt required');

  const afsim = b.afsim as Record<string, unknown> | undefined;
  if (!afsim || afsim.format !== 'AFSIM_LAYDOWN_V1') errors.push('afsim.format must be AFSIM_LAYDOWN_V1');
  if (!Array.isArray(afsim?.entities)) errors.push('afsim.entities must be an array');

  const economics = b.economics as Record<string, unknown> | undefined;
  if (!economics || typeof economics.note !== 'string') errors.push('economics.note required');
  if (!Array.isArray(economics?.scenarios)) errors.push('economics.scenarios must be an array');

  const metadata = b.metadata as Record<string, unknown> | undefined;
  if (!metadata) {
    errors.push('metadata required');
  } else {
    if (metadata.accredited_data_included !== false) {
      errors.push('metadata.accredited_data_included must be false');
    }
    if (typeof metadata.note !== 'string') errors.push('metadata.note required');
  }

  const planDoc = b.plan_document as Record<string, unknown> | undefined;
  if (!planDoc || typeof planDoc.version !== 'number') errors.push('plan_document.version required');

  if (errors.length) return { ok: false, errors };
  return { ok: true, bundle: bundle as UnifiedExportBundle };
}
