/**
 * Adapts force-catalogue platforms into the shape the interop engine consumes.
 * Kept separate so the engine stays free of catalogue types and remains testable
 * with hand-built fixtures.
 */

import type { InteropPlatform } from '@/lib/coalition/interop'

interface CatalogLike {
  id: string
  short_name?: string
  designation?: string
  nation_code?: string
  comms?: {
    standard?: string | null
    kind?: string
    gateway_capable?: boolean
    pnt_dependent?: boolean
    label?: string
  }[]
}

export function toInteropPlatforms(rows: CatalogLike[]): InteropPlatform[] {
  return rows.map((r) => ({
    id: r.id,
    label: r.short_name ?? r.designation ?? r.id,
    nationCode: r.nation_code ?? '?',
    bearers: (r.comms ?? []).map((c) => ({
      standard: c.standard ?? null,
      kind: c.kind ?? 'datalink',
      gatewayCapable: !!c.gateway_capable,
      pntDependent: !!c.pnt_dependent,
      label: c.label ?? c.standard ?? 'bearer',
    })),
  }))
}

/** Filter a catalogue to a coalition by nation code. */
export function forNations<T extends { nation_code?: string }>(rows: T[], codes: string[]): T[] {
  const want = new Set(codes)
  return rows.filter((r) => r.nation_code && want.has(r.nation_code))
}
