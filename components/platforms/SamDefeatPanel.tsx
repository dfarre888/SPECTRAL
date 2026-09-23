import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { kineticPctFromSam } from '@/lib/defeat/sam-matrix-bridge'
import { SAM_SYSTEM_IDS, getSamProfile } from '@/lib/risk/sam-intercept'

interface SamDefeatPanelProps {
  platformId: string
}

export function SamDefeatPanel({ platformId }: SamDefeatPanelProps) {
  const rows = SAM_SYSTEM_IDS.map((id) => {
    const pct = kineticPctFromSam(id, platformId)
    return {
      id,
      label: getSamProfile(id)?.nato_designation ?? id,
      pct: pct ?? 0,
      hasData: pct != null,
    }
  })
    .filter((r) => r.hasData)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)

  const heatMap = (
    <Link href="/defeat?view=heatmap" className="fc-action">
      Full heat map <ArrowUpRight size={13} aria-hidden />
    </Link>
  )

  if (rows.length === 0) {
    return (
      <div className="store-panel rounded-2xl px-5 py-4 h-full">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">SAM intercept Pk</h2>
          {heatMap}
        </div>
        <p className="mt-2 text-[13px] store-text-body">
          Reference SAM Pk bars are available for defeat-matrix UAS platforms.
        </p>
      </div>
    )
  }

  const maxPct = Math.max(...rows.map((r) => r.pct), 1)

  return (
    <div className="store-panel rounded-2xl px-5 py-4 h-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">
          SAM intercept Pk <span className="font-normal store-text-muted">(reference geometry)</span>
        </h2>
        {heatMap}
      </div>
      <ul className="mt-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[minmax(120px,34%)_1fr_48px] items-center gap-3 py-2 border-t border-[var(--store-line)] first:border-t-0"
          >
            <span className="text-[13px] text-[var(--store-ink)] truncate" title={row.label}>
              {row.label}
            </span>
            <span className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden" aria-hidden>
              <span
                className="block h-full rounded-full bg-[var(--wb-blue)]"
                style={{ width: `${(row.pct / maxPct) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono tabular-nums text-[13px] text-[var(--store-ink)]">
              {row.pct}
              <span className="ml-0.5 text-[11.5px] store-text-muted">%</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] store-text-muted">
        OSINT reference engagement, no ECM. Computed by the SAM intercept engine.
      </p>
    </div>
  )
}
