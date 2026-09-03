'use client'

import { useMemo } from 'react'
import type { SpectrumPlan, SpectrumPlotPoint } from '@/lib/bmi/bmi-types'
import { COMMS_BAND_REFERENCE } from '@/lib/bmi/spectrumPlanner'
import { StorePanel } from '@/components/ui/store-surface'

interface CommsSpectrumCanvasProps {
  plan: SpectrumPlan
  points: SpectrumPlotPoint[]
}

const KIND_COLOUR: Record<string, string> = {
  datalink: '#22D3EE',
  voice_uhf: '#F5B301',
  voice_vhf: '#F5B301',
  voice_hf: '#6366F1',
  voice_satcom: '#34D399',
  data_satcom: '#34D399',
}

export function CommsSpectrumCanvas({ plan, points }: CommsSpectrumCanvasProps) {
  const { minMhz, maxMhz, width } = useMemo(() => {
    const min = 3
    const max = 40000
    return { minMhz: min, maxMhz: max, width: 800 }
  }, [])

  function xPos(mhz: number): number {
    const logMin = Math.log10(minMhz)
    const logMax = Math.log10(maxMhz)
    const logX = Math.log10(Math.max(mhz, minMhz))
    return ((logX - logMin) / (logMax - logMin)) * width
  }

  const bands = Object.entries(COMMS_BAND_REFERENCE)

  return (
    <StorePanel className="p-4 space-y-3 ring-gradient glass">
      <div>
        <p className="text-sm font-semibold text-[#F7F9FC] store-display">
          Communications spectrum — frequency deconfliction
        </p>
        <p className="text-xs store-text-muted mt-1">
          Coalition comms/datalink bands only — not threat emitters or radar detection.
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} 220`}
          className="w-full min-w-[640px] h-auto"
          role="img"
          aria-label="Comms spectrum plot"
        >
          {bands.map(([band, ref]) => {
            const x1 = xPos(ref.range_mhz[0])
            const x2 = xPos(ref.range_mhz[1])
            const occ = plan.occupancy.find((o) => o.band === band)
            const fill =
              occ?.congestion === 'congested'
                ? 'rgba(239,68,68,0.12)'
                : occ?.congestion === 'moderate'
                  ? 'rgba(245, 179, 1, 0.1)'
                  : 'rgba(255,255,255,0.03)'
            const isBackbone = plan.backbone_band === band
            return (
              <g key={band}>
                <rect x={x1} y={40} width={Math.max(x2 - x1, 2)} height={140} fill={fill} />
                {isBackbone ? (
                  <rect
                    x={x1}
                    y={40}
                    width={Math.max(x2 - x1, 2)}
                    height={140}
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                ) : null}
                <text
                  x={(x1 + x2) / 2}
                  y={32}
                  textAnchor="middle"
                  fill="rgba(244,244,245,0.5)"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {ref.label}
                </text>
              </g>
            )
          })}

          {points.map((pt, i) => (
            <circle
              key={`${pt.platform_id}-${pt.label}-${i}`}
              cx={xPos(pt.x_mhz)}
              cy={100 + (i % 5) * 12}
              r={4}
              fill={KIND_COLOUR[pt.kind] ?? '#888'}
              opacity={0.85}
            >
              <title>{`${pt.platform_id}: ${pt.label}`}</title>
            </circle>
          ))}

          <text x={0} y={210} fill="rgba(244,244,245,0.4)" fontSize={8} fontFamily="JetBrains Mono">
            Frequency (MHz, log scale) — Source: BMI comms matrix · Pitch Black 2026
          </text>
        </svg>
      </div>

      {plan.backbone_band ? (
        <p className="text-xs font-mono text-[var(--cyan)]">
          Backbone: {plan.backbone_band}-band (Link 16) — protect for deconfliction
        </p>
      ) : null}
      <p className="text-xs store-text-muted">{plan.pnt_note}</p>
      {plan.warnings.map((w) => (
        <p key={w} className="text-xs text-[var(--store-gold)]">
          {w}
        </p>
      ))}
    </StorePanel>
  )
}
