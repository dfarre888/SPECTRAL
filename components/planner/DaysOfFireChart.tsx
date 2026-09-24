'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatUsd } from '@/lib/planner/cost-model'
import { shortLabel, type DofResult } from '@/lib/planner/days-of-fire'

/**
 * Two panels on one day axis, never two scales on one panel:
 *   top, engagements left in each expendable magazine (stacked, end of night);
 *   bottom, expected leakers per night (band between the Pk ends, line for the
 *   selected end).
 * Colour follows the effector, not its rank, so a layer keeps its hue when
 * others are switched off. The order below was run through the dataviz
 * palette validator for both themes (adjacent CVD separation >= 8).
 */
export const DOF_SERIES: Record<string, number> = {
  'gun-35mm': 1,
  apkws: 2,
  'coyote-b2': 3,
  'amraam-nasams': 4,
  'sm-2': 5,
  'sm-6': 6,
  'pac3-mse': 7,
}

export function seriesVar(id: string): string {
  return `var(--dof-s${DOF_SERIES[id] ?? 1})`
}

export const DOF_VIZ_STYLE = `
.dof-viz {
  --dof-s1: #3987e5; --dof-s2: #199e70; --dof-s3: #c98500; --dof-s4: #9085e9;
  --dof-s5: #d55181; --dof-s6: #008300; --dof-s7: #0891b2;
  --dof-leak: #ff6b7a; --dof-leak-band: rgba(255, 92, 110, 0.16);
  --dof-hover: rgba(255, 255, 255, 0.05);
}
[data-theme="light"] .dof-viz {
  --dof-s1: #2a78d6; --dof-s2: #1baf7a; --dof-s3: #eda100; --dof-s4: #4a3aa7;
  --dof-s5: #e87ba4; --dof-s6: #008300; --dof-s7: #0891b2;
  --dof-leak: #d7263d; --dof-leak-band: rgba(215, 38, 61, 0.12);
  --dof-hover: rgba(9, 9, 11, 0.04);
}
`

/** A round axis maximum and its ticks, stepping in 1, 2 or 5 times a power of ten. */
function niceScale(maxVal: number, target: number): { max: number; ticks: number[] } {
  const v = Math.max(maxVal, 1e-9)
  const raw = v / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((st) => st >= raw) ?? 10 * mag
  const max = Math.max(step, Math.ceil(v / step - 1e-9) * step)
  const ticks: number[] = []
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6)
  return { max, ticks }
}

export function fmtCount(n: number): string {
  if (!Number.isFinite(n)) return 'Reusable'
  if (n < 0.05) return '0'
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toLocaleString('en-AU')
  if (n < 10) return n.toFixed(1)
  return Math.round(n).toLocaleString('en-AU')
}

function fmtTick(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  if (n > 0 && n < 1) return n.toFixed(1)
  return String(Math.round(n * 10) / 10)
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(el)
    setW(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

interface Props {
  result: DofResult
  pkCase: 'low' | 'high'
  threatLabel: string
}

export function DaysOfFireChart({ result, pkCase, threatLabel }: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const run = pkCase === 'low' ? result.low : result.high
  const expendable = result.layers.filter((l) => !l.reusable)
  const reusable = result.layers.filter((l) => l.reusable)
  const n = run.nights.length

  const narrow = width > 0 && width < 640
  const M = { l: 48, r: narrow ? 12 : 104, t: 26, b: 26 }
  const TOP_H = 230
  const GAP = 44
  const BOT_H = 120
  const H = M.t + TOP_H + GAP + BOT_H + M.b
  const plotW = Math.max(10, width - M.l - M.r)
  const band = plotW / Math.max(1, n)
  const barW = Math.max(2, Math.min(28, band * 0.72))

  // Engagements left per expendable layer, end of night, in this run.
  const stacks = useMemo(
    () =>
      run.nights.map((night) =>
        expendable.map((l) => {
          const ln = night.layers.find((x) => x.id === l.id)
          return ln ? ln.roundsLeft / l.roundsPerEngagement : 0
        }),
      ),
    [run, expendable],
  )
  const startStack = expendable.reduce((s, l) => s + l.magazine / l.roundsPerEngagement, 0)
  const topScale = niceScale(Math.max(1, startStack, ...stacks.map((s) => s.reduce((a, b) => a + b, 0))), 4)
  const botScale = niceScale(Math.max(1, ...result.days.map((d) => d.leakers.hi)), 2)
  const topMax = topScale.max
  const botMax = botScale.max

  const x = (i: number) => M.l + i * band + band / 2
  const yTop = (v: number) => M.t + TOP_H - (v / topMax) * TOP_H
  const botY0 = M.t + TOP_H + GAP
  const yBot = (v: number) => botY0 + BOT_H - (v / botMax) * BOT_H

  const tickEvery = n <= 16 ? 1 : n <= 40 ? 5 : 10
  const xTicks = run.nights.map((nt) => nt.day).filter((d) => d === 1 || d % tickEvery === 0)

  const lineFor = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${yBot(v)}`).join('')
  const selLeak = run.nights.map((nt) => nt.leakers)
  const bandPath =
    n > 0
      ? `${result.days.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${yBot(d.leakers.hi)}`).join('')}` +
        `${[...result.days].reverse().map((d, j) => `L${x(n - 1 - j)},${yBot(d.leakers.lo)}`).join('')}Z`
      : ''

  /** Marker labels sit right of their line unless that would run off the plot. */
  const flipLabel = (i: number) => x(i) + 160 > M.l + plotW + (narrow ? 0 : M.r - 12)
  const firstDry = run.firstDry
  const firstLeak = run.firstLeakerDay
  const lastIdx = n - 1

  const summary = `${threatLabel}, ${n} nights at ${pkCase} Pk. ${
    firstDry ? `First magazine dry on day ${firstDry.day} (${shortLabel(firstDry.layerId)}).` : 'No magazine runs dry.'
  } ${firstLeak ? `First expected leaker by day ${firstLeak}.` : 'No leaker expected.'} Day-by-day values are in the table below.`

  const hoverNight = hover != null ? run.nights[hover] : null
  const hoverDay = hover != null ? result.days[hover] : null
  const tipLeft = hover != null ? x(hover) : 0
  const flip = tipLeft > width - 260

  return (
    <div data-dof-chart>
      {/* Legend: identity is never colour alone. */}
      <ul className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] store-text-body" aria-label="Chart legend">
        {expendable.map((l) => (
          <li key={l.id} className="inline-flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: seriesVar(l.id) }} />
            {shortLabel(l.id, l.label)}
          </li>
        ))}
        <li className="inline-flex items-center gap-2">
          <span aria-hidden className="h-[2px] w-4 rounded" style={{ background: 'var(--dof-leak)' }} />
          Leakers
        </li>
        {reusable.length ? (
          <li className="store-text-muted">
            {reusable.map((l) => shortLabel(l.id, l.label)).join(' and ')}: reusable, no magazine to draw
          </li>
        ) : null}
      </ul>

      <div ref={wrapRef} className="relative w-full" onMouseLeave={() => setHover(null)}>
        {width > 0 && n > 0 ? (
          <svg width={width} height={H} role="img" aria-label={summary} className="block overflow-visible">
            {/* Top panel title */}
            <text x={M.l} y={12} className="fill-[var(--store-ink-soft)] text-[12px]">
              Engagements left in each magazine, end of night
            </text>

            {/* Top grid + y ticks */}
            {topScale.ticks.map((t) => (
              <g key={`tt${t}`}>
                <line x1={M.l} x2={M.l + plotW} y1={yTop(t)} y2={yTop(t)} stroke="var(--store-line)" />
                <text x={M.l - 8} y={yTop(t) + 4} textAnchor="end" className="fill-[var(--store-ink-mute)] font-mono text-[11px]">
                  {fmtTick(t)}
                </text>
              </g>
            ))}

            {/* Hover column */}
            {hover != null ? (
              <rect x={M.l + hover * band} y={M.t} width={band} height={TOP_H + GAP + BOT_H} fill="var(--dof-hover)" />
            ) : null}

            {/* Stacked bars, 2px surface gap between segments */}
            {stacks.map((vals, i) => {
              let acc = 0
              const segs = vals.map((v, k) => {
                const y0 = yTop(acc)
                acc += v
                const y1 = yTop(acc)
                return { k, y: y1, h: y0 - y1 }
              })
              const visible = segs.filter((s) => s.h > 0.5)
              const topK = visible.length ? visible[visible.length - 1].k : -1
              return (
                <g key={`b${i}`}>
                  {visible.map((s) => {
                    const h = Math.max(0.5, s.h - (s.k === visible[0].k ? 0 : 2))
                    const bx = x(i) - barW / 2
                    const fill = seriesVar(expendable[s.k].id)
                    return s.k === topK ? (
                      <path key={s.k} d={topRoundedRect(bx, s.y, barW, h, 3)} fill={fill} />
                    ) : (
                      <rect key={s.k} x={bx} y={s.y} width={barW} height={h} fill={fill} />
                    )
                  })}
                </g>
              )
            })}

            {/* Direct labels at the last night, where a segment is tall enough */}
            {!narrow &&
              (() => {
                let acc = 0
                const last = stacks[lastIdx] ?? []
                const out: JSX.Element[] = []
                let lastY = Infinity
                last.forEach((v, k) => {
                  const y0 = yTop(acc)
                  acc += v
                  const y1 = yTop(acc)
                  const mid = (y0 + y1) / 2
                  if (y0 - y1 >= 14 && lastY - mid >= 14) {
                    out.push(
                      <text key={k} x={x(lastIdx) + barW / 2 + 8} y={mid + 4} className="fill-[var(--store-ink-soft)] text-[11.5px]">
                        {shortLabel(expendable[k].id)}
                      </text>,
                    )
                    lastY = mid
                  }
                })
                return out
              })()}

            {/* First magazine dry marker */}
            {firstDry ? (
              <g>
                <line
                  x1={x(firstDry.day - 1)}
                  x2={x(firstDry.day - 1)}
                  y1={M.t + 6}
                  y2={M.t + TOP_H}
                  stroke="var(--store-ink-mute)"
                  strokeDasharray="3 3"
                />
                <text
                  x={x(firstDry.day - 1) + (flipLabel(firstDry.day - 1) ? -6 : 6)}
                  y={M.t + 16}
                  textAnchor={flipLabel(firstDry.day - 1) ? 'end' : 'start'}
                  className="fill-[var(--store-ink)] text-[11.5px]"
                >
                  {shortLabel(firstDry.layerId)} dry, day {firstDry.day}
                </text>
              </g>
            ) : null}

            {/* Bottom panel */}
            <text x={M.l} y={botY0 - 12} className="fill-[var(--store-ink-soft)] text-[12px]">
              Expected leakers per night
            </text>
            {botScale.ticks.map((t) => (
              <g key={`bt${t}`}>
                <line x1={M.l} x2={M.l + plotW} y1={yBot(t)} y2={yBot(t)} stroke="var(--store-line)" />
                <text x={M.l - 8} y={yBot(t) + 4} textAnchor="end" className="fill-[var(--store-ink-mute)] font-mono text-[11px]">
                  {fmtTick(t)}
                </text>
              </g>
            ))}
            <path d={bandPath} fill="var(--dof-leak-band)" />
            <path d={lineFor(selLeak)} fill="none" stroke="var(--dof-leak)" strokeWidth={2} strokeLinejoin="round" />
            {!narrow ? (
              <text x={x(lastIdx) + 8} y={yBot(selLeak[lastIdx] ?? 0) + 4} className="fill-[var(--store-ink-soft)] text-[11.5px]">
                {pkCase === 'low' ? 'Low Pk' : 'High Pk'}
              </text>
            ) : null}
            {firstLeak ? (
              <g>
                <line
                  x1={x(firstLeak - 1)}
                  x2={x(firstLeak - 1)}
                  y1={botY0}
                  y2={botY0 + BOT_H}
                  stroke="var(--dof-leak)"
                  strokeDasharray="3 3"
                />
                <text
                  x={x(firstLeak - 1) + (flipLabel(firstLeak - 1) ? -6 : 6)}
                  y={botY0 + 12}
                  textAnchor={flipLabel(firstLeak - 1) ? 'end' : 'start'}
                  className="fill-[var(--store-ink)] text-[11.5px]"
                >
                  First leaker by day {firstLeak}
                </text>
              </g>
            ) : null}
            {hover != null ? (
              <circle cx={x(hover)} cy={yBot(selLeak[hover] ?? 0)} r={4.5} fill="var(--dof-leak)" stroke="var(--store-bg, #000)" strokeWidth={2} />
            ) : null}

            {/* X axis */}
            {xTicks.map((d) => (
              <text key={`x${d}`} x={x(d - 1)} y={H - 8} textAnchor="middle" className="fill-[var(--store-ink-mute)] font-mono text-[11px]">
                {d}
              </text>
            ))}
            <text x={M.l - 8} y={H - 8} textAnchor="end" className="fill-[var(--store-ink-mute)] text-[11px]">
              Day
            </text>

            {/* Hit targets, one per day, wider than the marks */}
            {run.nights.map((nt, i) => (
              <rect
                key={`h${nt.day}`}
                x={M.l + i * band}
                y={M.t}
                width={band}
                height={TOP_H + GAP + BOT_H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseMove={() => setHover(i)}
              />
            ))}
          </svg>
        ) : (
          <div style={{ height: H }} />
        )}

        {hoverNight && hoverDay ? (
          <div
            className="glass-popover pointer-events-none absolute z-10 w-[240px] p-3 text-[12px]"
            style={{ top: M.t + 8, left: flip ? tipLeft - 252 : tipLeft + 12 }}
            role="status"
          >
            <p className="flex justify-between font-medium text-[var(--store-ink)]">
              <span>Day {hoverNight.day}</span>
              <span className="font-mono store-text-body">{fmtCount(hoverNight.raid)} inbound</span>
            </p>
            <table className="mt-2 w-full font-mono text-[11.5px]">
              <tbody>
                {result.layers.map((l) => {
                  const ln = hoverNight.layers.find((z) => z.id === l.id)
                  return (
                    <tr key={l.id}>
                      <td className="py-0.5 pr-2 font-sans store-text-body">
                        <span className="inline-flex items-center gap-1.5">
                          {!l.reusable ? (
                            <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: seriesVar(l.id) }} />
                          ) : (
                            <span aria-hidden className="h-2 w-2" />
                          )}
                          {shortLabel(l.id, l.label)}
                        </span>
                      </td>
                      <td className="py-0.5 text-right text-[var(--store-ink)]">{fmtCount(ln?.engaged ?? 0)}</td>
                      <td className="py-0.5 pl-2 text-right store-text-muted">
                        {l.reusable ? 'reusable' : `${fmtCount((ln?.roundsLeft ?? 0) / l.roundsPerEngagement)} left`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-2 flex justify-between border-t border-[var(--store-line)] pt-2">
              <span className="store-text-body">Leakers</span>
              <span className="font-mono text-[var(--store-ink)]">
                {fmtCount(hoverDay.leakers.lo)}–{fmtCount(hoverDay.leakers.hi)}
              </span>
            </p>
            <p className="mt-1 flex justify-between">
              <span className="store-text-body">Spent to date</span>
              <span className="font-mono text-[var(--store-ink)]">
                {formatUsd(hoverDay.cumulativeCostUsd.lo)}–{formatUsd(hoverDay.cumulativeCostUsd.hi)}
              </span>
            </p>
            <p className="mt-1 text-[11px] store-text-muted">Threats engaged tonight, engagements left. {pkCase === 'low' ? 'Low' : 'High'} Pk run.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
