import type { ForceSide, TickResult, WoprEventRecord, WoprEventType } from '@/lib/wopr/types'

/** One row of the event log in analysis form. */
export interface EventRow {
  tick: number
  time_min: number
  side: ForceSide
  entity: string
  event_type: WoprEventType
  detail: string
}

/**
 * Ticks recorded before structured records existed only carry strings.
 * Classify them by their fixed prefixes so old history still exports usefully.
 */
export function recordFromLegacyEvent(text: string): WoprEventRecord {
  if (/^Turn \d+:/.test(text)) return { type: 'turn', side: 'referee', detail: text }
  if (/J\/S/.test(text)) {
    const pair = text.split(' ')[0]
    return { type: 'propagation', side: 'referee', entity: pair, detail: text }
  }
  if (/^Night transition|^First light/.test(text)) return { type: 'phase', side: 'referee', detail: text }
  return { type: 'note', side: 'referee', detail: text }
}

export function tickRecords(tick: TickResult): WoprEventRecord[] {
  if (tick.records && tick.records.length > 0) return tick.records
  return (tick.events ?? []).map(recordFromLegacyEvent)
}

/** Flatten ticks (any order) into event rows ordered by turn, then as logged. */
export function eventRows(ticks: readonly TickResult[]): EventRow[] {
  return [...ticks]
    .sort((a, b) => a.turn - b.turn)
    .flatMap((t) =>
      tickRecords(t).map((r) => ({
        tick: t.turn,
        time_min: t.elapsed_min,
        side: r.side,
        entity: r.entity ?? '',
        event_type: r.type,
        detail: r.detail,
      })),
    )
}
