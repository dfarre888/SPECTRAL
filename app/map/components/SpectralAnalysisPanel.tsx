'use client'

import { useLaydownAdjudication } from '@/app/map/hooks/useLaydownAdjudication'
import { Radio, Shield, Plane, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { PlatformThumbnail } from '@/components/platforms/PlatformThumbnail'
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface SpectralAnalysisPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  placedUas: PlacedUas[]
  placedCuas: PlacedCuas[]
  overlaps: OverlapVolume[]
}

function pctClass(pct: number): string {
  if (pct >= 50) return 'text-red-400'
  if (pct >= 30) return 'text-amber'
  return 'text-green'
}

function verdictTag(verdict: string): string {
  return verdict.replace(/_/g, ' ').toUpperCase()
}

export function SpectralAnalysisPanel({
  open,
  onOpenChange,
  placedUas,
  placedCuas,
  overlaps,
}: SpectralAnalysisPanelProps) {
  const analysis = useLaydownAdjudication(placedUas, placedCuas, overlaps, open)

  const hasPlaced = placedUas.length > 0 || placedCuas.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[var(--store-accent)]" />
            Spectral Laydown Analysis
          </SheetTitle>
          <SheetDescription className="text-xs">
            UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY — band overlap + defeat adjudication
          </SheetDescription>
        </SheetHeader>

        {!hasPlaced ? (
          <p className="mt-6 text-sm store-text-body">
            Place at least one UAS or C-UAS on the map to run spectral analysis.
          </p>
        ) : (
          <div className="mt-4 space-y-6 pb-8">
            {/* AeroCopilot brief */}
            <section className="rounded-xl border border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] p-3 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--store-accent)]">
                <Sparkles className="w-3.5 h-3.5" />
                AeroCopilot assessment
              </div>
              <p className="text-xs text-white leading-relaxed">{analysis.copilot.answer}</p>
              {analysis.copilot.reasoning && analysis.copilot.reasoning.length > 0 && (
                <ul className="text-[10px] store-text-muted space-y-1 list-disc pl-4">
                  {analysis.copilot.reasoning.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Summary chips */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <StatChip label="In envelope" value={analysis.summary.activeEngagements} colour="cyan" />
              <StatChip label="Blue favoured" value={analysis.summary.defeatLikely} colour="orange" />
              <StatChip label="Red survivable" value={analysis.summary.survivable} colour="green" />
              <StatChip label="Out of range" value={analysis.summary.outOfRange} colour="muted" />
            </div>

            {/* Band profiles */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest store-text-muted">
                Platform bands
              </h3>
              {analysis.uasProfiles.map((p) => (
                <BandProfileCard key={p.instanceId} profile={p} variant="uas" />
              ))}
              {analysis.cuasProfiles.map((p) => (
                <BandProfileCard key={p.instanceId} profile={p} variant="cuas" />
              ))}
            </section>

            {/* Pair assessments */}
            {analysis.pairs.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest store-text-muted">
                  Engagement pairs — gaps, overlaps &amp; tactics
                </h3>
                {analysis.pairs.map((pair) => (
                  <div
                    key={`${pair.uasInstanceId}-${pair.cuasInstanceId}`}
                    className="rounded-xl store-panel-inner p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {pair.cuasName}{' '}
                          <span className="store-text-muted font-normal">vs</span> {pair.uasName}
                        </p>
                        <p className="text-[10px] store-text-muted mt-0.5">
                          {pair.inDefeatRange
                            ? 'Inside defeat envelope'
                            : 'Outside defeat envelope — geometry blocks effect'}
                          {pair.isImmune ? ' · IMMUNE to primary defeat type' : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={clsx('text-lg font-mono font-bold', pctClass(pair.blueSuccessPct))}>
                          {pair.inDefeatRange ? `${pair.blueSuccessPct}%` : '—'}
                        </p>
                        <p className="text-[9px] store-text-muted">Blue success</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="rounded-lg store-panel px-2 py-1.5">
                        <span className="store-text-muted text-[10px]">Defeat matrix</span>
                        <p className="text-orange mt-0.5">
                          {pair.defeatMatrixPk != null ? `${pair.defeatMatrixPk}% Pk` : 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-lg store-panel px-2 py-1.5">
                        <span className="store-text-muted text-[10px]">Spectrum</span>
                        <p className="text-cyan mt-0.5">{verdictTag(pair.spectrum.verdict)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-mono text-orange uppercase tracking-wider mb-1">
                        Blue defeat tactic
                      </p>
                      <p className="text-[11px] store-text-body leading-snug">{pair.blueTactic}</p>
                      <p className="text-[10px] store-text-muted mt-1 leading-snug">{pair.spectrum.detail}</p>
                    </div>

                    {pair.bandOverlaps.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-mono text-cyan uppercase tracking-wider mb-1">
                          Band overlaps ({pair.bandOverlaps.length})
                        </p>
                        <ul className="space-y-1">
                          {pair.bandOverlaps.map((o) => (
                            <li
                              key={`${o.redCapability.id}-${o.blueCapability.id}`}
                              className="text-[10px] font-mono store-text-body flex gap-1"
                            >
                              <span className="text-green">✓</span>
                              {o.redCapability.label} ∩ {o.blueCapability.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-amber">
                        No RF/GNSS band overlap — spectrum gap; kinetic/DEW path required
                      </p>
                    )}

                    {pair.propagation && (
                      <div>
                        <p className="text-[10px] font-mono store-text-muted uppercase tracking-wider mb-1">
                          RF propagation (server)
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <span className="store-text-muted">
                            LOS: <span className="text-cyan">{pair.propagation.los_state}</span>
                          </span>
                          <span className="store-text-muted">
                            Loss: <span className="text-[var(--store-accent)]">{pair.propagation.path_loss_db} dB</span>
                          </span>
                          <span className="store-text-muted">
                            Multipath margin: {pair.propagation.multipath_margin_db} dB
                          </span>
                          <span className="store-text-muted">
                            J/S:{' '}
                            {pair.propagation.jam_to_signal_db != null
                              ? `${pair.propagation.jam_to_signal_db} dB`
                              : '—'}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono store-text-muted mt-1">
                          {pair.propagation.confidence} — {pair.propagation.model_tier.join(', ')}
                          {pair.propagation.propagationGated ? ' · propagation gated' : ''}
                          {pair.propagation.buildingObstructed ? ' · building occlusion' : ''}
                        </p>
                      </div>
                    )}

                    {pair.uncoveredGaps.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono text-amber uppercase tracking-wider mb-1">
                          Gaps — threat bands not jammed
                        </p>
                        <ul className="space-y-0.5">
                          {pair.uncoveredGaps.map((g) => (
                            <li key={g.id} className="text-[10px] font-mono store-text-muted">
                              ○ {g.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-mono text-green uppercase tracking-wider mb-1">
                        UAS survival tactics
                      </p>
                      <ul className="space-y-0.5">
                        {pair.uasSurvivalTactics.map((t) => (
                          <li key={t} className="text-[10px] store-text-body leading-snug">
                            → {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatChip({
  label,
  value,
  colour,
}: {
  label: string
  value: number
  colour: 'cyan' | 'orange' | 'green' | 'muted'
}) {
  const colours = {
    cyan: 'border-cyan/30 text-cyan',
    orange: 'border-orange/30 text-orange',
    green: 'border-green/30 text-green',
    muted: 'border-[var(--store-line)] store-text-muted',
  }
  return (
    <div className={clsx('rounded-xl store-panel-inner px-2 py-1.5 border', colours[colour])}>
      <p className="store-text-muted text-[10px]">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  )
}

function BandProfileCard({
  profile,
  variant,
}: {
  profile: {
    assetId: string
    name: string
    bands: { label: string; axis: string; range: string; derived: boolean }[]
    redundancies: string[]
  }
  variant: 'uas' | 'cuas'
}) {
  const Icon = variant === 'uas' ? Plane : Shield
  const accent = variant === 'uas' ? 'text-cyan' : 'text-orange'

  return (
    <div className="rounded-xl store-panel-inner p-2.5">
      <div className="flex items-center gap-2 mb-2">
        <PlatformThumbnail
          id={profile.assetId}
          name={profile.name}
          size="xs"
          variant={variant === 'uas' ? 'uas' : 'cuas'}
        />
        <Icon className={clsx('w-3 h-3', accent)} />
        <span className="text-[11px] font-semibold text-white truncate">{profile.name}</span>
      </div>
      {profile.bands.length === 0 ? (
        <p className="text-[10px] store-text-muted">No RF bands catalogued — RF-silent or autonomous</p>
      ) : (
        <ul className="space-y-0.5 max-h-28 overflow-y-auto">
          {profile.bands.map((b) => (
            <li key={`${b.label}-${b.range}`} className="text-[10px] font-mono flex justify-between gap-2">
              <span className={clsx('store-text-body truncate', b.derived && 'opacity-70')}>
                {b.derived ? '≈ ' : ''}
                {b.label}
              </span>
              <span className="text-cyan shrink-0">{b.range}</span>
            </li>
          ))}
        </ul>
      )}
      {profile.redundancies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--store-line)]">
          <p className="text-[9px] store-text-muted uppercase mb-1 font-semibold tracking-wider">Redundancies</p>
          <ul className="space-y-0.5">
            {profile.redundancies.map((r) => (
              <li key={r} className="text-[10px] text-green leading-snug">
                + {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
