import { eventRows, type EventRow } from '@/lib/wopr/export/events'
import type { TickResult } from '@/lib/wopr/types'

export const EVENT_CSV_COLUMNS = ['tick', 'time_min', 'side', 'entity', 'event_type', 'detail'] as const

/**
 * RFC 4180 field: quote when it holds a comma, quote or line break; double
 * embedded quotes. Text that a spreadsheet would run as a formula (leading
 * = + - @ or a control character) gets a leading apostrophe.
 */
export function csvField(value: string | number): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  let v = value
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`
  return v
}

export function eventRowsToCsv(rows: readonly EventRow[], marking?: string): string {
  const lines: string[] = []
  // Protective marking travels with the data. Pandas: read_csv(..., comment='#').
  if (marking) lines.push(`# ${marking.replace(/[\r\n]+/g, ' ')}`)
  lines.push(EVENT_CSV_COLUMNS.join(','))
  for (const r of rows) {
    lines.push(
      [r.tick, r.time_min, r.side, r.entity, r.event_type, r.detail].map(csvField).join(','),
    )
  }
  return lines.join('\r\n') + '\r\n'
}

export function eventsToCsv(ticks: readonly TickResult[], marking?: string): string {
  return eventRowsToCsv(eventRows(ticks), marking)
}
