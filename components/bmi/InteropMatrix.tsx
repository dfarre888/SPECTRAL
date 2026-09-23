'use client'

import { useMemo, useState } from 'react'
import type { InteropLink } from '@/lib/bmi/bmi-types'
import { ScrollArea } from '@/components/ui/ScrollArea'

/** Link quality is data: green direct, amber via a gateway, grey voice only, red nothing. */
const METHOD_STYLE: Record<InteropLink['method'], { fill: string; label: string; text: string }> = {
  direct: { fill: 'rgba(74, 222, 128, 0.78)', label: 'Direct datalink', text: '#6EE7A0' },
  via_gateway: { fill: 'rgba(251, 191, 36, 0.78)', label: 'Via gateway', text: '#FCD34D' },
  voice_only: { fill: 'rgba(142, 142, 147, 0.42)', label: 'Voice only', text: 'var(--store-ink-soft)' },
  none: { fill: 'rgba(255, 92, 110, 0.5)', label: 'No link', text: '#FF8A98' },
}

const ORDER: InteropLink['method'][] = ['direct', 'via_gateway', 'voice_only', 'none']

interface InteropMatrixProps {
  platformIds: string[]
  platformLabels: Record<string, string>
  /** Nation code per platform id, shown beside each label. */
  platformNations?: Record<string, string>
  links: InteropLink[]
  gateways: { gateway_id: string; bridges: string[] }[]
  selectedA?: string | null
  selectedB?: string | null
  onSelectCell?: (a: string, b: string) => void
}

export function InteropMatrix({
  platformIds,
  platformLabels,
  platformNations,
  links,
  gateways,
  selectedA,
  selectedB,
  onSelectCell,
}: InteropMatrixProps) {
  const [hover, setHover] = useState<[string, string] | null>(null)

  const linkMap = useMemo(() => {
    const m = new Map<string, InteropLink>()
    for (const l of links) {
      m.set(`${l.a_id}|${l.b_id}`, l)
      m.set(`${l.b_id}|${l.a_id}`, l)
    }
    return m
  }, [links])

  function linkFor(a: string, b: string): InteropLink | undefined {
    return linkMap.get(`${a}|${b}`)
  }

  const label = (id: string) => platformLabels[id] ?? id
  const nation = (id: string) => platformNations?.[id]

  const counts = useMemo(() => {
    const c: Record<InteropLink['method'], number> = { direct: 0, via_gateway: 0, voice_only: 0, none: 0 }
    for (let i = 0; i < platformIds.length; i++) {
      for (let j = i + 1; j < platformIds.length; j++) {
        const l = linkMap.get(`${platformIds[i]}|${platformIds[j]}`)
        c[l?.method ?? 'none']++
      }
    }
    return c
  }, [platformIds, linkMap])

  const readout = hover ? { a: hover[0], b: hover[1], link: linkFor(hover[0], hover[1]) } : null

  if (platformIds.length < 2) {
    return (
      <div className="store-panel rounded-2xl p-10 text-center">
        <p className="text-[14px] store-text-body m-0">Interop needs at least two platforms in view.</p>
        <p className="text-[12px] store-text-muted mt-1.5 mb-0">Clear a filter to widen the force.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {gateways.length > 0 ? (
        <section className="store-panel rounded-2xl px-5 py-4" aria-label="Critical gateway nodes">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-[15px] font-semibold text-[var(--store-ink)] m-0">Critical gateway nodes</h3>
            <span className="text-[12px] store-text-muted">Lose these and the coalition picture fragments.</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {gateways.map((g) => (
              <span key={g.gateway_id} className="tag amber" title={g.bridges.map(label).join(', ')}>
                {label(g.gateway_id)}
                <span className="font-mono tabular-nums opacity-80">bridges {g.bridges.length}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] store-text-muted" aria-label="Legend">
        {ORDER.map((k) => (
          <span key={k} className="inline-flex items-center gap-2">
            <i className="h-3 w-3 rounded-[3px]" style={{ background: METHOD_STYLE[k].fill }} aria-hidden />
            {METHOD_STYLE[k].label}
            <span className="font-mono tabular-nums text-[var(--store-ink-soft)]">{counts[k]}</span>
          </span>
        ))}
        <span className="ml-auto">Pairs among {platformIds.length} platforms. Click a cell to build its PACE plan.</span>
      </div>

      <div className="min-h-[44px] flex items-center gap-2 px-1 text-[13px]" aria-live="polite">
        {readout ? (
          <>
            <span className="text-[var(--store-ink)] font-medium">{label(readout.a)}</span>
            {nation(readout.a) ? <span className="font-mono text-[12px] store-text-muted">{nation(readout.a)}</span> : null}
            <span className="store-text-muted" aria-hidden>↔</span>
            <span className="text-[var(--store-ink)] font-medium">{label(readout.b)}</span>
            {nation(readout.b) ? <span className="font-mono text-[12px] store-text-muted">{nation(readout.b)}</span> : null}
            <span className="store-text-muted" aria-hidden>·</span>
            <span style={{ color: METHOD_STYLE[readout.link?.method ?? 'none'].text }}>{METHOD_STYLE[readout.link?.method ?? 'none'].label}</span>
            {readout.link?.note ? <span className="store-text-body truncate">· {readout.link.note}</span> : null}
          </>
        ) : (
          <span className="store-text-muted">Point at a cell to read the link between two platforms.</span>
        )}
      </div>

      <ScrollArea maxHeight="calc(100vh - 180px)" className="w-fit max-w-full">
        <table className="border-separate border-spacing-0 m-0" onMouseLeave={() => setHover(null)}>
          <caption className="sr-only">Platform to platform interoperability</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-[4] bg-[var(--store-bg)] border-b border-r border-[var(--glass-line)] text-left align-bottom px-4 pb-2.5 text-[12px] font-semibold text-[var(--store-ink)]"
              >
                Platform
              </th>
              {platformIds.map((id) => {
                const hot = hover && (hover[1] === id)
                return (
                  <th
                    key={id}
                    scope="col"
                    title={`${label(id)}${nation(id) ? ` (${nation(id)})` : ''}`}
                    className="sticky top-0 z-[3] bg-[var(--store-bg)] border-b border-[var(--glass-line)] align-bottom px-0 pt-3 pb-2.5 w-[30px]"
                  >
                    <span
                      className={`inline-block max-h-[112px] overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium ${hot ? 'text-white' : 'text-[var(--store-ink-soft)]'}`}
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {label(id)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {platformIds.map((a) => {
              const hotRow = hover && hover[0] === a
              return (
                <tr key={a}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-[2] bg-[var(--store-bg)] border-r border-[var(--glass-line)] text-left font-normal px-4 py-0 whitespace-nowrap text-[12.5px] ${hotRow ? 'text-white' : 'text-[var(--store-ink)]'}`}
                  >
                    <span className="inline-flex items-baseline gap-2">
                      <span className="max-w-[160px] truncate">{label(a)}</span>
                      {nation(a) ? <span className="font-mono text-[11.5px] store-text-muted">{nation(a)}</span> : null}
                    </span>
                  </th>
                  {platformIds.map((b) => {
                    if (a === b) {
                      return (
                        <td key={b} className="p-[3px]">
                          <span className="block w-6 h-6 rounded-[5px] bg-[rgba(142,142,147,0.12)]" aria-hidden />
                        </td>
                      )
                    }
                    const link = linkFor(a, b)
                    const method = link?.method ?? 'none'
                    const style = METHOD_STYLE[method]
                    const selected =
                      (selectedA === a && selectedB === b) ||
                      (selectedA === b && selectedB === a)
                    return (
                      <td key={b} className="p-[3px]">
                        <button
                          type="button"
                          title={`${label(a)} ↔ ${label(b)}: ${style.label}${link?.note ? `. ${link.note}` : ''}`}
                          aria-label={`${label(a)} to ${label(b)}: ${style.label}`}
                          onClick={() => onSelectCell?.(a, b)}
                          onMouseEnter={() => setHover([a, b])}
                          onFocus={() => setHover([a, b])}
                          className="block w-6 h-6 rounded-[5px] transition-[filter,box-shadow] duration-150 hover:brightness-125"
                          style={{
                            background: style.fill,
                            boxShadow: selected
                              ? '0 0 0 2px var(--wb-blue), 0 0 12px rgba(41,151,255,0.6)'
                              : hover && (hover[0] === a || hover[1] === b)
                                ? 'inset 0 0 0 1px rgba(255,255,255,0.35)'
                                : undefined,
                          }}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  )
}
