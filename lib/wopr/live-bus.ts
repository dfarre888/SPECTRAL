import type { TickResult } from '@/lib/wopr/types'

type Subscriber = (event: { type: string; payload: unknown }) => void

/** Channel key: tenantId:scenarioId — prevents cross-tenant COP bleed. */
const channels = new Map<string, Set<Subscriber>>()

export function scenarioChannelKey(tenantId: string, scenarioId: string): string {
  return `${tenantId}:${scenarioId}`
}

export function subscribeScenario(
  tenantId: string,
  scenarioId: string,
  fn: Subscriber,
): () => void {
  const key = scenarioChannelKey(tenantId, scenarioId)
  if (!channels.has(key)) channels.set(key, new Set())
  channels.get(key)!.add(fn)
  return () => {
    channels.get(key)?.delete(fn)
    if (channels.get(key)?.size === 0) channels.delete(key)
  }
}

export function publishScenarioEvent(
  tenantId: string,
  scenarioId: string,
  type: string,
  payload: unknown,
): void {
  const subs = channels.get(scenarioChannelKey(tenantId, scenarioId))
  if (!subs) return
  for (const fn of subs) fn({ type, payload })
}

export function publishTick(tenantId: string, scenarioId: string, tick: TickResult): void {
  publishScenarioEvent(tenantId, scenarioId, 'tick', tick)
}

/** Close all subscribers for a scenario — call on session end or scenario delete. */
export function closeScenarioChannel(tenantId: string, scenarioId: string): void {
  const key = scenarioChannelKey(tenantId, scenarioId)
  const subs = channels.get(key)
  if (!subs) return
  for (const fn of subs) {
    fn({ type: 'close', payload: { reason: 'channel_closed' } })
  }
  channels.delete(key)
}

export function activeScenarioStreamCount(tenantId: string, scenarioId: string): number {
  return channels.get(scenarioChannelKey(tenantId, scenarioId))?.size ?? 0
}
