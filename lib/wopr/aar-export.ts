import type { PropagationCacheEntry, WoprScenario } from '@/lib/wopr/types'

export interface AarPropagationTick {
  turn: number
  elapsed_min: number
  pairs: PropagationCacheEntry[]
}

/** Export tick-by-tick propagation for After Action Review (training deliverable). */
export function buildAarPropagationTimeline(
  scenario: WoprScenario,
  tickHistory: Array<{ turn: number; elapsed_min: number; cache: Record<string, PropagationCacheEntry> }>,
): AarPropagationTick[] {
  return tickHistory.map((t) => ({
    turn: t.turn,
    elapsed_min: t.elapsed_min,
    pairs: Object.values(t.cache),
  }))
}

export function aarToCsv(timeline: AarPropagationTick[]): string {
  const rows = ['turn,elapsed_min,pair_key,jts_db,los_state,combined_pk,propagation_gated']
  for (const tick of timeline) {
    for (const p of tick.pairs) {
      rows.push(
        [
          tick.turn,
          tick.elapsed_min,
          p.pairKey,
          p.jam_to_signal_db ?? '',
          p.los_state,
          p.combinedBlueSuccessPct,
          p.propagationGated,
        ].join(','),
      )
    }
  }
  return rows.join('\n')
}
