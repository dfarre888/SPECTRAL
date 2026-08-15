'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import { SendToMapBar } from '@/components/force/SendToMapBar'
import { confidenceVariant } from '@/lib/force/effects'
import type { NationCompare } from '@/lib/force/types'

interface NationCompareClientProps {
  compare: NationCompare
  theatreId?: string
}

export function NationCompareClient({ compare, theatreId = 'scs' }: NationCompareClientProps) {
  const [selected, setSelected] = useState<string[]>(() => {
    const pick = (side: typeof compare.a) =>
      side.platforms.filter((p) => p.effect === 'find' || p.effect === 'shield' || p.effect === 'sea_control').slice(0, 6)
    return [...pick(compare.a), ...pick(compare.b)].map((p) => p.id)
  })

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  return (
    <div className="space-y-4">
      <StorePanel className="p-4">
        <p className="text-sm text-white">{compare.headline}</p>
        <p className="mt-2 text-xs store-text-body">{compare.caveat}</p>
      </StorePanel>

      <div className="overflow-x-auto rounded-2xl border border-[var(--store-line)]">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-[var(--store-surface-2)] font-mono text-[10px] uppercase store-text-muted">
            <tr>
              <th className="px-3 py-2">Effect</th>
              <th className="px-3 py-2">{compare.a.nation.shortName}</th>
              <th className="px-3 py-2">{compare.b.nation.shortName}</th>
              <th className="px-3 py-2">So what</th>
              <th className="px-3 py-2">Gap</th>
            </tr>
          </thead>
          <tbody>
            {compare.cells.map((cell) => (
              <tr key={cell.effect} className="border-t border-[var(--store-line)] align-top">
                <td className="px-3 py-3">
                  <p className="font-medium text-white">{cell.label}</p>
                  <Badge variant={confidenceVariant(cell.confidence)} className="mt-1">
                    {cell.confidence}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <p className="font-mono text-lg text-white tabular-nums">{cell.a_count}</p>
                  <p className="store-text-muted">{cell.a_names.join(' · ') || '—'}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-mono text-lg text-white tabular-nums">{cell.b_count}</p>
                  <p className="store-text-muted">{cell.b_names.join(' · ') || '—'}</p>
                </td>
                <td className="px-3 py-3 store-text-body">{cell.so_what}</td>
                <td className="px-3 py-3 store-text-body">{cell.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SendToMapBar
        blue={compare.a.nation.side === 'red' ? compare.b.nation.code : compare.a.nation.code}
        red={compare.a.nation.side === 'red' ? compare.a.nation.code : compare.b.nation.code}
        selectedIds={selected}
        theatreId={theatreId}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {[compare.a, compare.b].map((side) => (
          <StorePanel key={side.nation.code} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">{side.nation.shortName} package</p>
              <Link href={`/force/${side.nation.code.toLowerCase()}`} className="text-[11px] text-cyan hover:underline">
                Full ORBAT
              </Link>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {side.platforms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-[11px] store-text-body">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="text-white">{p.short_name}</span>
                  <span className="font-mono store-text-muted">{p.domain}</span>
                </label>
              ))}
            </div>
          </StorePanel>
        ))}
      </div>
    </div>
  )
}
