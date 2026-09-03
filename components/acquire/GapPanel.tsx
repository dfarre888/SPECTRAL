'use client'

import type { GapAnalysisResult } from '@/lib/acquire/acquire-types'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'

interface GapPanelProps {
  gap: GapAnalysisResult
  templateTitle: string
}

const SEVERITY_STYLE: Record<GapAnalysisResult['severity'], string> = {
  critical: 'text-red border-red/30 bg-red/10',
  high: 'text-[var(--store-accent)] border-[var(--store-accent-border)] bg-[var(--store-accent-glow)]',
  moderate: 'text-amber border-amber/30 bg-amber/10',
}

export function GapPanel({ gap, templateTitle }: GapPanelProps) {
  return (
    <div className="space-y-4">
      <StorePanel className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle
            className="w-5 h-5 text-[var(--store-accent)] shrink-0 mt-0.5"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-white">{templateTitle}</p>
            <p className="text-xs store-text-body mt-1">{gap.narrative}</p>
          </div>
        </div>

        <span
          className={`inline-flex text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${SEVERITY_STYLE[gap.severity]}`}
        >
          {gap.severity} gap
        </span>
      </StorePanel>

      <div className="grid gap-4 md:grid-cols-2">
        <StorePanel className="p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest store-text-muted mb-3">
            Required effect
          </h3>
          <p className="text-sm store-text-body">{gap.required_effect}</p>
          <p className="text-xs font-mono store-text-muted mt-3">
            Threat: {gap.threat_name} · Location: {gap.location}
          </p>
        </StorePanel>

        <StorePanel className="p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest store-text-muted mb-3">
            OrBat context ({gap.orbat_platform_count} platforms)
          </h3>
          <ul className="space-y-1 text-xs store-text-body">
            {gap.orbat_summary.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </StorePanel>
      </div>

      <StorePanel className="p-4">
        <h3 className="text-xs font-mono uppercase tracking-widest store-text-muted mb-3">
          Coverage gaps
        </h3>
        <ul className="space-y-2 text-sm store-text-body">
          {gap.coverage_gaps.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-[var(--store-accent)]">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </StorePanel>

      <div className="flex flex-wrap gap-3 text-xs font-mono">
        <Link href="/pcm/force-design" className="text-cyan hover:opacity-80">
          → Force Design (/pcm/force-design)
        </Link>
        <Link href="/defeat" className="text-cyan hover:opacity-80">
          → Defeat Matrix
        </Link>
        <Link href="/currency" className="store-text-muted hover:text-white">
          → MOAT training note (Currency Queue — DS view for blind spots)
        </Link>
      </div>
    </div>
  )
}
