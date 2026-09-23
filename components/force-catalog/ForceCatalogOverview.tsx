'use client'

/**
 * Callers: ForceCatalogClient.tsx
 * Purpose: Overview of the filtered catalogue: headline counts, domain by
 * force side, and platforms by nation.
 * API/schema: none (static props)
 */

import { useMemo } from 'react'
import type { CatalogNation, Domain, ForceCatalogPlatformFull, ForceSideCatalog } from '@/lib/bmi/bmi-types'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StorePanel } from '@/components/ui/store-surface'
import { SideDot, sideColor } from '@/components/force-catalog/force-catalog-ui'

const DOMAINS: Domain[] = ['air', 'ground', 'maritime']

interface NationRow {
  code: string
  name: string
  side: ForceSideCatalog
  region: string | null
  count: number
}

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
    const nationRows: NationRow[] = [...byNation.entries()].map(([code, count]) => {
      const n = nations.find((x) => x.code === code)
      return { code, count, name: n?.name ?? code, side: n?.force_side ?? 'neutral', region: n?.region ?? null }
    })
    return { blue, red, matrix, nationRows, total: platforms.length }
  }, [platforms, nations])

  const maxNation = Math.max(1, ...stats.nationRows.map((n) => n.count))
  const maxDomain = Math.max(1, ...DOMAINS.map((d) => stats.matrix[d].blue + stats.matrix[d].red))

  const nationColumns: DataColumn<NationRow>[] = [
    {
      key: 'name',
      header: 'Nation',
      sticky: true,
      sortValue: (n) => n.name,
      cell: (n) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <SideDot side={n.side} />
          <span className="min-w-0">
            <span className="primary block truncate">{n.name}</span>
            <span className="meta truncate">
              <span className="font-mono">{n.code}</span>
              {n.region ? ` · ${n.region}` : ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'side',
      header: 'Side',
      width: 96,
      sortValue: (n) => n.side,
      cell: (n) => (
        <span className={`tag ${n.side === 'blue' ? 'blue' : n.side === 'red' ? 'red' : ''}`}>
          {n.side.charAt(0).toUpperCase() + n.side.slice(1)}
        </span>
      ),
    },
    {
      key: 'count',
      header: 'Platforms',
      width: 220,
      align: 'right',
      sortValue: (n) => n.count,
      cell: (n) => (
        <span className="flex items-center justify-end gap-3">
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.06]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(n.count / maxNation) * 100}%`, background: sideColor(n.side) }}
            />
          </span>
          <span className="w-9 text-[var(--store-ink)]">{n.count}</span>
        </span>
      ),
    },
  ]

  const headline: { k: string; v: number; hue?: string }[] = [
    { k: 'Platforms in filter', v: stats.total },
    { k: 'Blue', v: stats.blue, hue: 'var(--wb-blue)' },
    { k: 'Red', v: stats.red, hue: 'var(--wb-red)' },
    { k: 'Future programs', v: futureCount, hue: '#C4B5FD' },
    { k: 'Nations', v: stats.nationRows.length },
  ]

  return (
    <div className="space-y-4">
      <StorePanel className="grid grid-cols-2 sm:grid-cols-5">
        {headline.map((h, i) => (
          <div key={h.k} className={`px-5 py-4 ${i > 0 ? 'sm:border-l sm:border-[var(--store-line)]' : ''}`}>
            <p className="text-[12px] store-text-muted">{h.k}</p>
            <p
              className="mt-1 store-display text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
              style={{ color: h.hue ?? 'var(--store-ink)' }}
            >
              {h.v}
            </p>
          </div>
        ))}
      </StorePanel>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <StorePanel className="overflow-hidden">
          <div className="border-b border-[var(--store-line)] px-5 py-3.5">
            <p className="wb-pane-title">Domain by force side</p>
          </div>
          <table className="dt">
            <caption className="sr-only">Platforms by domain and force side</caption>
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col" className="text-right">
                  <span className="inline-flex items-center gap-1.5"><SideDot side="blue" />Blue</span>
                </th>
                <th scope="col" className="text-right">
                  <span className="inline-flex items-center gap-1.5"><SideDot side="red" />Red</span>
                </th>
                <th scope="col" className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map((d) => {
                const row = stats.matrix[d]
                const tot = row.blue + row.red
                return (
                  <tr key={d}>
                    <td className="primary capitalize">
                      {d}
                      <span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]" style={{ width: `${(tot / maxDomain) * 100}%` }}>
                        <i style={{ flex: row.blue, background: 'var(--wb-blue)' }} />
                        <i style={{ flex: row.red, background: 'var(--wb-red)' }} />
                      </span>
                    </td>
                    <td className="num text-[var(--wb-blue)]">{row.blue}</td>
                    <td className="num text-[var(--wb-red)]">{row.red}</td>
                    <td className="num text-[var(--store-ink)]">{tot}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="border-t border-[var(--store-line)] px-5 py-3 text-[12px] store-text-muted">
            Neutral platforms are counted in the headline total only.
          </p>
        </StorePanel>

        <div className="space-y-2">
          <p className="wb-pane-title px-1">Platforms by nation</p>
          <DataTable
            rows={stats.nationRows}
            columns={nationColumns}
            rowKey={(n) => n.code}
            defaultSort={{ key: 'count', dir: 'desc' }}
            caption="Platforms by nation"
            compact
            maxHeight="calc(100vh - 200px)"
            empty="No platforms in filter."
          />
        </div>
      </div>
    </div>
  )
}
