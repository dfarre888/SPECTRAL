import Link from 'next/link'
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

  if (rows.length === 0) {
    return (
      <div className="store-panel rounded-2xl p-6 mt-6">
        <p className="text-sm store-text-body">Reference SAM Pk bars available for defeat-matrix UAS platforms.</p>
        <Link href="/defeat?view=heatmap" className="text-[var(--store-accent)] text-sm mt-2 inline-block">Open defeat heat map →</Link>
      </div>
    )
  }

  const maxPct = Math.max(...rows.map((r) => r.pct), 1)

  return (
    <div className="store-panel rounded-2xl p-6 mt-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Top SAM intercept Pk (reference geometry)</h2>
        <Link href="/defeat?view=heatmap" className="text-xs font-mono text-[var(--store-accent)] hover:opacity-80">
          Full heat map →
        </Link>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">{row.label}</span>
              <span className="text-[#F97316]">{row.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-700 via-amber-600 to-red-700"
                style={{ width: `${(row.pct / maxPct) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] font-mono store-text-muted">OSINT reference engagement — no ECM. Computed via SAM intercept engine.</p>
    </div>
  )
}
