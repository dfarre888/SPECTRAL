'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { ConfidenceTag } from '@/components/force/ConfidenceTag'
import { SendToMapBar } from '@/components/force/SendToMapBar'
import { FORCE_EFFECT_LABEL, type NationCompare } from '@/lib/force/types'

interface NationCompareClientProps {
  compare: NationCompare
  theatreId?: string
}

type Cell = NationCompare['cells'][number]

const sideColor = (side: string) => (side === 'red' ? 'var(--wb-red)' : 'var(--wb-blue)')

export function NationCompareClient({ compare, theatreId = 'scs' }: NationCompareClientProps) {
  const [selected, setSelected] = useState<string[]>(() => {
    const pick = (side: typeof compare.a) =>
      side.platforms.filter((p) => p.effect === 'find' || p.effect === 'shield' || p.effect === 'sea_control').slice(0, 6)
    return [...pick(compare.a), ...pick(compare.b)].map((p) => p.id)
  })

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  const columns = useMemo<DataColumn<Cell>[]>(() => {
    const sideCol = (key: 'a' | 'b'): DataColumn<Cell> => {
      const side = compare[key]
      return {
        key,
        width: 240,
        label: side.nation.shortName,
        header: (
          <span className="inline-flex items-center gap-2">
            <i className="h-1.5 w-1.5 rounded-full" style={{ background: sideColor(side.nation.side) }} aria-hidden />
            {side.nation.shortName}
            <span className="font-normal store-text-muted">types</span>
          </span>
        ),
        sortValue: (c) => (key === 'a' ? c.a_count : c.b_count),
        cell: (c) => {
          const n = key === 'a' ? c.a_count : c.b_count
          const names = key === 'a' ? c.a_names : c.b_names
          return (
            <div className="min-w-0">
              <span
                className="font-mono text-[18px] leading-none tabular-nums"
                style={{ color: n ? sideColor(side.nation.side) : 'var(--store-ink-mute)' }}
              >
                {n}
              </span>
              <span className="meta" title={names.join(' · ')}>
                {names.join(' · ') || 'None catalogued'}
              </span>
            </div>
          )
        },
      }
    }
    return [
      {
        key: 'effect',
        header: 'Effect',
        width: 200,
        sticky: true,
        sortValue: (c) => c.label,
        cell: (c) => (
          <div className="min-w-0">
            <span className="primary block text-[13px] leading-snug">{c.label}</span>
            <ConfidenceTag nato={c.confidence} className="mt-1.5" />
          </div>
        ),
      },
      sideCol('a'),
      sideCol('b'),
      {
        key: 'so_what',
        header: 'So what',
        cell: (c) => <span className="block min-w-[220px] leading-relaxed store-text-body">{c.so_what}</span>,
      },
      {
        key: 'gap',
        header: 'Gap',
        cell: (c) => <span className="block min-w-[200px] leading-relaxed text-[var(--store-ink)]">{c.gap}</span>,
      },
    ]
  }, [compare])

  return (
    <div className="space-y-5">
      <div className="max-w-[92ch]">
        <p className="text-[15px] leading-snug text-[var(--store-ink)]">{compare.headline}</p>
        <p className="mt-1.5 text-[12px] leading-relaxed store-text-muted">{compare.caveat}</p>
      </div>

      <DataTable
        rows={compare.cells}
        columns={columns}
        rowKey={(c) => c.effect}
        caption={`${compare.a.nation.shortName} and ${compare.b.nation.shortName} effect matrix`}
        maxHeight="none"
        className="[&_tbody_td]:!align-top [&_tbody_td]:!py-3.5"
      />

      <SendToMapBar
        blue={compare.a.nation.side === 'red' ? compare.b.nation.code : compare.a.nation.code}
        red={compare.a.nation.side === 'red' ? compare.a.nation.code : compare.b.nation.code}
        selectedIds={selected}
        theatreId={theatreId}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {[compare.a, compare.b].map((side) => {
          const inPkg = side.platforms.filter((p) => selected.includes(p.id)).length
          return (
            <StorePanel key={side.nation.code} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--store-line)] px-4 py-3">
                <i className="h-2 w-2 rounded-full" style={{ background: sideColor(side.nation.side) }} aria-hidden />
                <p className="wb-pane-title">{side.nation.shortName} package</p>
                <span className="text-[12px] store-text-muted">
                  <span className="font-mono tabular-nums text-[var(--store-ink)]">{inPkg}</span> of {side.platforms.length}
                </span>
                <Link href={`/force/${side.nation.code.toLowerCase()}`} className="fc-action ml-auto">
                  Full ORBAT
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              <ScrollArea frame={false} maxHeight="320px">
                <ul className="py-1.5">
                  {side.platforms.map((p) => {
                    const on = selected.includes(p.id)
                    return (
                      <li key={p.id}>
                        <label className="flex min-h-9 cursor-pointer items-center gap-3 px-4 transition-colors duration-150 hover:bg-white/[0.04]">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(p.id)}
                            className="h-3.5 w-3.5 shrink-0 accent-[var(--wb-blue)]"
                          />
                          <span className={`min-w-0 flex-1 truncate text-[13px] ${on ? 'text-[var(--store-ink)]' : 'store-text-body'}`} title={p.designation}>
                            {p.short_name}
                          </span>
                          <span className="hidden shrink-0 text-[12px] store-text-muted sm:inline">{FORCE_EFFECT_LABEL[p.effect]}</span>
                          <span className="w-16 shrink-0 text-right font-mono text-[12px] store-text-muted">{p.domain}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            </StorePanel>
          )
        })}
      </div>
    </div>
  )
}
