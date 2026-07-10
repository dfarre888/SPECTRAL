import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  emptyLaydownDocument,
  type BattlespacePlanRow,
  type MapLaydownDocument,
} from '@/lib/planner/battlespace-plan';
import type { IadsStackInstance } from '@/lib/planner/iads-stacks';
import type { LaydownSessionPair } from '@/lib/map/laydown-session';
import type { EconomicsScenarioRef } from '@/lib/planner/battlespace-plan';

/** Read-through cache only — DB is source of truth for mutations. */
const memory = new Map<string, BattlespacePlanRow>();
const MEMORY_MAX = 500;
const memoryOrder: string[] = [];

function cachePlan(plan: BattlespacePlanRow): void {
  if (!memory.has(plan.id)) {
    memoryOrder.push(plan.id);
  }
  memory.set(plan.id, plan);
  while (memoryOrder.length > MEMORY_MAX) {
    const evict = memoryOrder.shift();
    if (evict) memory.delete(evict);
  }
}

function rowToPlan(row: Record<string, unknown>): BattlespacePlanRow {
  return {
    id: row.id as string,
    tenant_id: (row.tenant_id as string | null) ?? null,
    user_id: row.user_id as string,
    name: row.name as string,
    classification: row.classification as string,
    phase: row.phase as BattlespacePlanRow['phase'],
    vignette_id: (row.vignette_id as string | null) ?? null,
    laydown: (row.laydown as MapLaydownDocument) ?? emptyLaydownDocument(),
    iads_stacks: (row.iads_stacks as IadsStackInstance[]) ?? [],
    economics_scenarios: (row.economics_scenarios as EconomicsScenarioRef[]) ?? [],
    adjudication_pairs: (row.adjudication_pairs as LaydownSessionPair[] | null) ?? null,
    published_wopr_id: (row.published_wopr_id as string | null) ?? null,
    published_pcm_exercise_id: (row.published_pcm_exercise_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listPlans(userId: string, tenantId?: string | null): Promise<BattlespacePlanRow[]> {
  const supabase = await createClient();
  let q = supabase.from('battlespace_plans').select('*').order('updated_at', { ascending: false });
  if (tenantId) {
    q = q.or(`user_id.eq.${userId},tenant_id.eq.${tenantId}`);
  } else {
    q = q.eq('user_id', userId);
  }
  const { data, error } = await q;
  if (error) throw new Error(`listPlans failed: ${error.message}`);
  const plans = (data ?? []).map(rowToPlan);
  for (const p of plans) cachePlan(p);
  return plans;
}

export async function getPlan(id: string, userId: string): Promise<BattlespacePlanRow | null> {
  const cached = memory.get(id);
  if (cached && cached.user_id === userId) return cached;

  const supabase = await createClient();
  const { data, error } = await supabase.from('battlespace_plans').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`getPlan failed: ${error.message}`);
  if (!data) return null;

  const plan = rowToPlan(data);
  if (plan.user_id !== userId) return null;
  cachePlan(plan);
  return plan;
}

export interface CreatePlanInput {
  name: string;
  tenantId?: string | null;
  userId: string;
  classification: string;
  vignetteId?: string | null;
  laydown?: MapLaydownDocument;
}

export async function createPlan(input: CreatePlanInput): Promise<BattlespacePlanRow> {
  const payload = {
    tenant_id: input.tenantId ?? null,
    user_id: input.userId,
    name: input.name,
    classification: input.classification,
    vignette_id: input.vignetteId ?? null,
    laydown: input.laydown ?? emptyLaydownDocument(),
  };

  const supabase = await createClient();
  const { data, error } = await supabase.from('battlespace_plans').insert(payload).select('*').single();
  if (error) throw new Error(`createPlan failed: ${error.message}`);

  const plan = rowToPlan(data);
  cachePlan(plan);
  return plan;
}

export interface UpdatePlanInput {
  name?: string;
  phase?: BattlespacePlanRow['phase'];
  laydown?: MapLaydownDocument;
  iads_stacks?: IadsStackInstance[];
  economics_scenarios?: EconomicsScenarioRef[];
  adjudication_pairs?: LaydownSessionPair[] | null;
  published_wopr_id?: string | null;
  published_pcm_exercise_id?: string | null;
}

export async function updatePlan(id: string, userId: string, patch: UpdatePlanInput): Promise<BattlespacePlanRow | null> {
  const existing = await getPlan(id, userId);
  if (!existing) return null;

  const updated_at = new Date().toISOString();
  const row = {
    name: patch.name ?? existing.name,
    phase: patch.phase ?? existing.phase,
    laydown: patch.laydown ?? existing.laydown,
    iads_stacks: patch.iads_stacks ?? existing.iads_stacks,
    economics_scenarios: patch.economics_scenarios ?? existing.economics_scenarios,
    adjudication_pairs: patch.adjudication_pairs !== undefined ? patch.adjudication_pairs : existing.adjudication_pairs,
    published_wopr_id: patch.published_wopr_id !== undefined ? patch.published_wopr_id : existing.published_wopr_id,
    published_pcm_exercise_id:
      patch.published_pcm_exercise_id !== undefined ? patch.published_pcm_exercise_id : existing.published_pcm_exercise_id,
    updated_at,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('battlespace_plans')
    .update(row)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`updatePlan failed: ${error.message}`);

  const plan = rowToPlan(data);
  cachePlan(plan);
  return plan;
}

export async function deletePlan(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from('battlespace_plans').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`deletePlan failed: ${error.message}`);

  memory.delete(id);
  const idx = memoryOrder.indexOf(id);
  if (idx >= 0) memoryOrder.splice(idx, 1);
  return true;
}

const REVISION_PRUNE_THRESHOLD = 50;
const REVISION_KEEP_LAST = 50;

/** Prune old plan revisions — owner-scoped via RLS. */
export async function prunePlanRevisions(planId: string, keepLastN = REVISION_KEEP_LAST): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('battlespace_plan_revisions')
    .select('id, revision')
    .eq('plan_id', planId)
    .order('revision', { ascending: false });
  if (error || !data || data.length <= keepLastN) return;

  const toDelete = data.slice(keepLastN).map((r) => r.id);
  await supabase.from('battlespace_plan_revisions').delete().in('id', toDelete);
}
