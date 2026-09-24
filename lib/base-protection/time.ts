/**
 * Local wall-clock time at a site to UTC, using the IANA zone database built
 * into Intl. No library, handles daylight saving (NSW, VIC, SA) and the
 * half-hour zones (NT, SA).
 */

function partsAt(instantMs: number, timeZone: string): Record<string, number> {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const out: Record<string, number> = {}
  for (const p of dtf.formatToParts(new Date(instantMs))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return out
}

/** Offset of `timeZone` from UTC at an instant, in minutes (east positive). */
export function tzOffsetMinutes(instantMs: number, timeZone: string): number {
  const p = partsAt(instantMs, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60000)
}

export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export function isLocalDateTime(v: string): boolean {
  return LOCAL_RE.test(v)
}

/**
 * Convert `YYYY-MM-DDTHH:mm` wall-clock time in `timeZone` to UTC.
 * Returns null for malformed input or an unknown zone.
 */
export function zonedLocalToUtc(local: string, timeZone: string): { utc: string; offset: string } | null {
  const m = LOCAL_RE.exec(local)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[]
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null
  try {
    const guess = Date.UTC(y, mo - 1, d, h, mi)
    const off1 = tzOffsetMinutes(guess, timeZone)
    let utcMs = guess - off1 * 60000
    const off2 = tzOffsetMinutes(utcMs, timeZone)
    if (off2 !== off1) utcMs = guess - off2 * 60000
    return { utc: new Date(utcMs).toISOString(), offset: formatOffset(tzOffsetMinutes(utcMs, timeZone)) }
  } catch {
    return null
  }
}

/** Current wall-clock time in a zone as `YYYY-MM-DDTHH:mm` (form default). */
export function nowLocal(timeZone: string, nowMs = Date.now()): string {
  try {
    const p = partsAt(nowMs, timeZone)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
  } catch {
    return new Date(nowMs).toISOString().slice(0, 16)
  }
}

/** `2026-07-11 11:40Z` style display for a UTC ISO string. */
export function formatUtc(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}Z`
}
