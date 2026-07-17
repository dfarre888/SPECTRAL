'use client'

import { Badge } from '@/components/ui/badge'
import { StorePanel } from '@/components/ui/store-surface'
import type { ThreatAssessment } from '@/lib/map/threat-assessment'
import { cn } from '@/lib/utils'
import { Crosshair, Radar, Shield, Target } from 'lucide-react'

interface ThreatAssessmentPanelProps {
  assessments: ThreatAssessment[]
  selectedUasInstanceId: string | null
  onSelectUas: (instanceId: string) => void
  adjudicationSource?: string
}

function pctTone(pct: number): string {
  if (pct >= 50) return 'text-red-400'
  if (pct >= 30) return 'text-amber'
  return 'text-green-400'
}

function PctBar({ label, pct, icon: Icon }: { label: string; pct: number; icon: typeof Radar }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] store-text-muted uppercase tracking-wider">
          <Icon className="w-3 h-3" />
          {label}
        </span>
        <span className={cn('text-sm font-mono font-semibold', pctTone(pct))}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--store-surface-2)] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 50 ? 'bg-red-500/80' : pct >= 30 ? 'bg-amber/80' : 'bg-green-500/80',
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  )
}

export function ThreatAssessmentPanel({
  assessments,
  selectedUasInstanceId,
  onSelectUas,
  adjudicationSource,
}: ThreatAssessmentPanelProps) {
  if (assessments.length === 0) return null

  const active =
    assessments.find((a) => a.uasInstanceId === selectedUasInstanceId) ?? assessments[0]

  return (
    <StorePanel className="absolute top-3 right-3 z-20 w-[min(100%,22rem)] p-3 shadow-xl pointer-events-auto border-[var(--store-accent-border)]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)] flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Threat assessment
          </p>
          <p className="text-[9px] store-text-muted mt-0.5">OSINT estimate · Confidence: Assessed · not fire control</p>
        </div>
        {adjudicationSource && adjudicationSource !== 'client' && (
          <Badge variant="assessed" className="text-[9px] shrink-0">
            {adjudicationSource}
          </Badge>
        )}
      </div>

      {assessments.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {assessments.map((a) => (
            <button
              key={a.uasInstanceId}
              type="button"
              onClick={() => onSelectUas(a.uasInstanceId)}
              className={cn(
                'px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-colors truncate max-w-full',
                active.uasInstanceId === a.uasInstanceId
                  ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                  : 'border-[var(--store-line)] store-text-muted hover:text-white',
              )}
            >
              {a.uasName}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs font-medium text-white mb-3 leading-snug">{active.uasName}</p>

      <div className="space-y-3 mb-4">
        <PctBar label="P(detect)" pct={active.detectionPct} icon={Radar} />
        <PctBar label="P(defeat)" pct={active.defeatPct} icon={Shield} />
      </div>

      {active.bestPlacedCuas && (
        <p className="text-[10px] store-text-body mb-3">
          <span className="store-text-muted">Best placed: </span>
          <span className="font-mono text-cyan">{active.bestPlacedCuas.name}</span>
          {!active.inEngagement && (
            <span className="block text-amber mt-0.5">Outside defeat envelope — geometry blocks engagement</span>
          )}
        </p>
      )}

      <div className="space-y-2 border-t border-[var(--store-line)] pt-3">
        <p className="text-[10px] font-semibold store-text-muted uppercase tracking-wider flex items-center gap-1">
          <Crosshair className="w-3 h-3" />
          Recommended (catalog)
        </p>
        {active.recommendedDetection && (
          <div className="store-panel-inner rounded-lg px-2.5 py-2">
            <p className="text-[10px] store-text-muted">Best detection</p>
            <p className="text-xs font-mono text-white">{active.recommendedDetection.name}</p>
            <p className={cn('text-[11px] font-mono', pctTone(active.recommendedDetection.pct))}>
              P(detect) {active.recommendedDetection.pct}%
            </p>
            <p className="text-[9px] store-text-muted mt-0.5 leading-relaxed">
              {active.recommendedDetection.reason}
            </p>
          </div>
        )}
        {active.recommendedDefeat && (
          <div className="store-panel-inner rounded-lg px-2.5 py-2">
            <p className="text-[10px] store-text-muted">Best defeat</p>
            <p className="text-xs font-mono text-white">{active.recommendedDefeat.name}</p>
            <p className={cn('text-[11px] font-mono', pctTone(active.recommendedDefeat.pct))}>
              P(defeat) {active.recommendedDefeat.pct}%
            </p>
            <p className="text-[9px] store-text-muted mt-0.5 leading-relaxed">
              {active.recommendedDefeat.reason}
            </p>
          </div>
        )}
      </div>

      {active.tacticNote && (
        <p className="text-[9px] store-text-muted mt-3 leading-relaxed border-t border-[var(--store-line)] pt-2">
          {active.tacticNote}
        </p>
      )}
    </StorePanel>
  )
}
