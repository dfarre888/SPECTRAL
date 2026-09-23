'use client'

import { useMemo } from 'react'
import type { BandOccupancy, SpectrumPlan, SpectrumPlotPoint } from '@/lib/bmi/bmi-types'
import { COMMS_BAND_REFERENCE } from '@/lib/bmi/spectrumPlanner'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'

interface CommsSpectrumCanvasProps {
  plan: SpectrumPlan
  points: SpectrumPlotPoint[]
  /** Short names per platform id, for the occupancy table. */
  platformLabels?: Record<string, string>
}

const KIND_COLOUR: Record<string, string> = {
  datalink: '#22D3EE',
  voice_uhf: '#FBBF24',
  voice_vhf: '#FBBF24',
  voice_hf: '#818CF8',
  voice_satcom: '#34D399',
  data_satcom: '#34D399',
}

const KIND_LEGEND: { label: string; colour: string }[] = [
  { label: 'Datalink', colour: '#22D3EE' },
  { label: 'VHF / UHF voice', colour: '#FBBF24' },
  { label: 'HF voice', colour: '#818CF8' },
  { label: 'SATCOM', colour: '#34D399' },
]

const CONGESTION_FILL: Record<BandOccupancy['congestion'], string> = {
  congested: 'rgba(255, 92, 110, 0.14)',
  moderate: 'rgba(251, 191, 36, 0.10)',
  clear: 'rgba(142, 142, 147, 0.08)',
}

const CONGESTION_TAG: Record<BandOccupancy['congestion'], string> = {
  congested: 'red',
  moderate: 'amber',
  clear: 'green',
}

const W = 1000
const PLOT_TOP = 44
const PLOT_H = 150
const MIN_MHZ = 3
const MAX_MHZ = 40000

function xPos(mhz: number): number {
  const logMin = Math.log10(MIN_MHZ)
  const logMax = Math.log10(MAX_MHZ)
  const logX = Math.log10(Math.max(mhz, MIN_MHZ))
  return ((logX - logMin) / (logMax - logMin)) * W
}

function fmtMhz(mhz: number): string {
  return mhz >= 1000 ? `${mhz / 1000} GHz` : `${mhz} MHz`
}

export function CommsSpectrumCanvas({ plan, points, platformLabels = {} }: CommsSpectrumCanvasProps) {
  const bands = Object.entries(COMMS_BAND_REFERENCE)

  // Stack each band's bearers in a small grid so every point stays visible.
  const placed = useMemo(() => {
    const perBand = new Map<string, number>()
    return points.map((pt) => {
      const i = perBand.get(pt.band) ?? 0
      perBand.set(pt.band, i + 1)
      const col = Math.floor(i / 6)
      const row = i % 6
      return { pt, cx: xPos(pt.x_mhz) + (col % 2 === 0 ? 1 : -1) * Math.ceil(col / 2) * 11, cy: PLOT_TOP + 22 + row * 20 }
    })
  }, [points])

  const columns = useMemo<DataColumn<BandOccupancy>[]>(() => [
    {
      key: 'band',
      header: 'Band',
      width: 110,
      sortValue: (o) => COMMS_BAND_REFERENCE[o.band].range_mhz[0],
      cell: (o) => <span className="text-[13px] font-medium text-[var(--store-ink)]">{o.label}</span>,
    },
    {
      key: 'range',
      header: 'Range',
      width: 170,
      cell: (o) => {
        const [lo, hi] = COMMS_BAND_REFERENCE[o.band].range_mhz
        return <span className="font-mono text-[12px] tabular-nums store-text-body">{fmtMhz(lo)} to {fmtMhz(hi)}</span>
      },
    },
    {
      key: 'bearers',
      header: 'Bearers',
      width: 100,
      align: 'right',
      sortValue: (o) => o.bearer_count,
      cell: (o) => <span className="text-[var(--store-ink)]">{o.bearer_count}</span>,
    },
    {
      key: 'platforms',
      header: 'Platforms',
      sortValue: (o) => o.platforms.length,
      cell: (o) => {
        const names = o.platforms.map((id) => platformLabels[id] ?? id)
        return (
          <span className="block text-[12.5px] store-text-body" title={names.join(', ')}>
            <span className="font-mono tabular-nums text-[var(--store-ink)] mr-2">{o.platforms.length}</span>
            <span className="store-text-muted">{names.slice(0, 6).join(', ')}{names.length > 6 ? ` and ${names.length - 6} more` : ''}</span>
          </span>
        )
      },
    },
    {
      key: 'datalink',
      header: 'Datalink',
      width: 100,
      sortValue: (o) => (o.datalink_present ? 1 : 0),
      cell: (o) => (o.datalink_present ? <span className="text-[12.5px] text-[#67E8F9]">Yes</span> : <span className="text-[12.5px] store-text-muted">No</span>),
    },
    {
      key: 'congestion',
      header: 'Congestion',
      width: 130,
      sortValue: (o) => (o.congestion === 'congested' ? 2 : o.congestion === 'moderate' ? 1 : 0),
      cell: (o) => <span className={`tag ${CONGESTION_TAG[o.congestion]}`}>{o.congestion}</span>,
    },
  ], [platformLabels])

  return (
    <div className="space-y-5">
      <section className="store-panel rounded-2xl p-6 space-y-4" aria-label="Comms spectrum">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div>
            <h3 className="text-[16px] store-display font-semibold tracking-[-0.01em] text-[var(--store-ink)] m-0">
              Communications spectrum
            </h3>
            <p className="text-[13px] store-text-muted mt-1 mb-0">
              Coalition comms and datalink bands only, not threat emitters or radar detection.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] store-text-muted" aria-label="Legend">
            {KIND_LEGEND.map((k) => (
              <span key={k.label} className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full" style={{ background: k.colour }} aria-hidden />
                {k.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <i className="h-3 w-3 rounded-[3px]" style={{ background: CONGESTION_FILL.congested, boxShadow: 'inset 0 0 0 1px rgba(255,92,110,0.5)' }} aria-hidden />
              Congested
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-3 w-3 rounded-[3px] border border-dashed border-[#22D3EE]" aria-hidden />
              Backbone
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} 250`}
            className="w-full min-w-[760px] h-auto"
            role="img"
            aria-label="Comms spectrum plot, frequency on a log scale"
          >
            {bands.map(([band, ref]) => {
              const x1 = xPos(ref.range_mhz[0])
              const x2 = xPos(ref.range_mhz[1])
              const occ = plan.occupancy.find((o) => o.band === band)
              const fill = occ ? CONGESTION_FILL[occ.congestion] : 'rgba(142,142,147,0.04)'
              const isBackbone = plan.backbone_band === band
              const narrow = x2 - x1 < 44
              return (
                <g key={band}>
                  <rect x={x1} y={PLOT_TOP} width={Math.max(x2 - x1, 2)} height={PLOT_H} fill={fill} />
                  <line x1={x1} x2={x1} y1={PLOT_TOP} y2={PLOT_TOP + PLOT_H} stroke="rgba(142,142,147,0.22)" />
                  {isBackbone ? (
                    <rect
                      x={x1 + 1}
                      y={PLOT_TOP + 1}
                      width={Math.max(x2 - x1 - 2, 2)}
                      height={PLOT_H - 2}
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                    />
                  ) : null}
                  <text
                    x={(x1 + x2) / 2}
                    y={narrow ? 22 : 32}
                    textAnchor="middle"
                    style={{ fill: occ ? 'var(--store-ink)' : 'var(--store-ink-mute)' }}
                    fontSize={13}
                  >
                    {narrow ? ref.label.replace('-band', '') : ref.label}
                  </text>
                  <text
                    x={x1 + 3}
                    y={PLOT_TOP + PLOT_H + 18}
                    style={{ fill: 'var(--store-ink-mute)' }}
                    fontSize={12}
                    className="font-mono"
                  >
                    {ref.range_mhz[0] >= 1000 ? `${ref.range_mhz[0] / 1000}G` : ref.range_mhz[0]}
                  </text>
                </g>
              )
            })}

            {placed.map(({ pt, cx, cy }, i) => (
              <circle
                key={`${pt.platform_id}-${pt.label}-${i}`}
                cx={cx}
                cy={cy}
                r={5}
                fill={KIND_COLOUR[pt.kind] ?? '#8E8E93'}
                style={{ stroke: 'var(--store-bg)' }}
                strokeWidth={1}
              >
                <title>{`${platformLabels[pt.platform_id] ?? pt.platform_id}: ${pt.label}`}</title>
              </circle>
            ))}

            <text x={0} y={244} style={{ fill: 'var(--store-ink-mute)' }} fontSize={12}>
              Frequency, MHz, log scale. Source: BMI comms matrix, Pitch Black 2026.
            </text>
          </svg>
        </div>

        <div className="pt-4 border-t fc-hair space-y-1.5">
          {plan.backbone_band ? (
            <p className="text-[13px] m-0">
              <span className="text-[#67E8F9] font-medium">Backbone: {plan.backbone_band}-band (Link 16).</span>{' '}
              <span className="store-text-body">Protect for deconfliction.</span>
            </p>
          ) : null}
          <p className="text-[13px] store-text-body m-0">{plan.pnt_note}</p>
          {plan.warnings.map((w) => (
            <p key={w} className="text-[13px] text-[#FCD34D] m-0">
              {w.replace(' — ', ': ')}
            </p>
          ))}
        </div>
      </section>

      <DataTable
        rows={plan.occupancy}
        columns={columns}
        rowKey={(o) => o.band}
        compact
        caption="Band occupancy"
        empty="No bearers in view."
      />
    </div>
  )
}
