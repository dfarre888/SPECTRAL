type PlanSubscriber = (event: { type: string; payload: unknown }) => void;

const channels = new Map<string, Set<PlanSubscriber>>();

export function planChannelKey(tenantId: string | null, planId: string): string {
  return `${tenantId ?? 'user'}:${planId}`;
}

export function subscribePlan(
  tenantId: string | null,
  planId: string,
  fn: PlanSubscriber,
): () => void {
  const key = planChannelKey(tenantId, planId);
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key)!.add(fn);
  return () => {
    channels.get(key)?.delete(fn);
    if (channels.get(key)?.size === 0) channels.delete(key);
  };
}

export function publishPlanEvent(
  tenantId: string | null,
  planId: string,
  type: string,
  payload: unknown,
): void {
  const subs = channels.get(planChannelKey(tenantId, planId));
  if (!subs) return;
  for (const fn of subs) fn({ type, payload });
}
