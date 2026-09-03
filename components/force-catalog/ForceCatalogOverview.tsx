'use client'

/**
 * Callers: ForceCatalogClient.tsx
 * Purpose: Overview matrix (domain × side, top nations) from filtered ForceCatalogPlatformFull[]
 * API/schema: none (static props)
 * User: Force Catalogue — $10B OrBat workstation (UI polish v2)
 */

import { useMemo } from 'react'
import type { CatalogNation, Domain, ForceCatalogPlatformFull, ForceSideCatalog } from '@/lib/bmi/bmi-types'
import { StorePanel } from '@/components/ui/store-surface'
import { StatChip } from '@/components/force-catalog/force-catalog-ui'

const DOMAINS: Domain[] = ['air', 'ground', 'maritime']
const SIDES: ForceSideCatalog[] = ['blue', 'red']

export function ForceCatalogOverview({
  platforms,
  nations,
  futureCount,
}: {
  platforms: ForceCatalogPlatformFull[]
  nations: CatalogNation[]
  futureCount: number
}) {
  const stats = useMemo(() => {
    const blue = platforms.filter((p) => p.force_side === 'blue').length
    const red = platforms.filter((p) => p.force_side === 'red').length
    const matrix: Record<Domain, Record<'blue' | 'red', number>> = {
      air: { blue: 0, red: 0 },
      ground: { blue: 0, red: 0 },
      maritime: { blue: 0, red: 0 },
    }
    for (const p of platforms) {
      if (p.force_side === 'blue' || p.force_side === 'red') {
        matrix[p.domain][p.force_side] += 1
      }
    }
    const byNation = new Map<string, number>()
    for (const p of platforms) {
      byNation.set(p.nation_code, (byNation.get(p.nation_code) ?? 0) + 1)
    }
    const topNations = [...byNation.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([code, count]) => ({
        code,
        count,
        name: nations.find((n) => n.code === code)?.name ?? code,
        side: nations.find((n) => n.code === code)?.force_side,
      }))
    return { blue, red, matrix, topNations, total: platforms.length }
  }, [platforms, nations])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatChip label="platforms" value={stats.total} accent />
        <StatChip label="blue" value={stats.blue} accent />
        <StatChip label="red" value={stats.red} />
        <StatChip label="future in filter" value={futureCount} />
        <StatChip label="nations hit" value={stats.topNations.length} />
      </div>

      <StorePanel className="p-4 space-y-3">
        <h2 className="text-xs store-display store-text-body tracking-wide text-balance">
          Domain × force side
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono tabular-nums">
            <thead>
              <tr className="store-text-muted text-left">
                <th className="py-2 pr-3 font-normal">Domain</th>
                {SIDES.map((s) => (
                  <th key={s} className="py-2 pr-3 font-normal capitalize">
                    {s}
                  </th>
                ))}
                <th className="py-2 font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map((d) => {
                const row = stats.matrix[d]
                return (
                  <tr key={d} className="border-t store-line">
                    <td className="py-2 pr-3 store-text-body capitalize">{d}</td>
                    <td className="py-2 pr-3 text-[var(--store-accent)]">{row.blue}</td>
                    <td className="py-2 pr-3 store-text-body">{row.red}</td>
                    <td className="py-2 store-text-muted">{row.blue + row.red}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </StorePanel>

      <StorePanel className="p-4 space-y-3">
        <h2 className="text-xs store-display store-text-body tracking-wide">Top nations</h2>
        <ul className="space-y-2">
          {stats.topNations.map((n) => (
            <li key={n.code} className="flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="store-text-body">
                {n.name}{' '}
                <span className="store-text-muted">
                  ({n.code} · {n.side})
                </span>
              </span>
              <span className="tabular-nums store-text-muted">{n.count}</span>
            </li>
          ))}
          {stats.topNations.length === 0 ? (
            <li className="text-[11px] font-mono store-text-muted">No platforms in filter.</li>
          ) : null}
        </ul>
      </StorePanel>
    </div>
  )
}
