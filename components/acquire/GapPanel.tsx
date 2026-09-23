'use client'

import { useState, type ReactNode } from 'react'
import type { GapAnalysisResult } from '@/lib/acquire/acquire-types'
import Link from 'next/link'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { StorePanel } from '@/components/ui/store-surface'

interface GapPanelProps {
  gap: GapAnalysisResult
  templateTitle: string
}

const SEVERITY: Record<GapAnalysisResult['severity'], { label: string; tag: string; ink: string }> = {
  critical: { label: 'Critical gap', tag: 'tag red', ink: 'var(--wb-red)' },
  high: { label: 'High gap', tag: 'tag amber', ink: '#FBBF24' },
  moderate: { label: 'Moderate gap', tag: 'tag', ink: 'var(--store-ink-soft)' },
}

function PanelTitle({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-[15px] font-semibold text-[var(--store-ink)]">{children}</h3>
      {meta ? <span className="text-xs font-mono store-text-muted">{meta}</span> : null}
    </div>
  )
}

/** Catalogue matches shown before the list folds away. */
const CATALOGUE_PREVIEW = 8

export function GapPanel({ gap, templateTitle }: GapPanelProps) {
  const sev = SEVERITY[gap.severity]
  const [showAllCatalogue, setShowAllCatalogue] = useState(false)
  const catalogue = gap.existing_cuas_systems
  const shownCatalogue = showAllCatalogue ? catalogue : catalogue.slice(0, CATALOGUE_PREVIEW)
  return (
    <div className="space-y-4">
      <StorePanel className="p-6">
        <div className="flex items-start gap-4">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--lacquer-line)] bg-[rgba(255,255,255,0.03)]"
            aria-hidden
          >
            <AlertTriangle className="h-[18px] w-[18px]" style={{ color: sev.ink }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="store-display text-[19px] font-semibold tracking-[-0.01em] text-[var(--store-ink)]">
                {templateTitle}
              </h2>
              <span className={sev.tag}>{sev.label}</span>
            </div>
            <p className="mt-2 max-w-[90ch] text-[14px] leading-relaxed store-text-body">{gap.narrative}</p>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
              <div className="flex gap-2">
                <dt className="store-text-muted">Threat</dt>
                <dd className="font-mono text-[var(--store-ink)]">{gap.threat_name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="store-text-muted">Location</dt>
                <dd className="font-mono text-[var(--store-ink)]">{gap.location}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="store-text-muted">Base</dt>
                <dd className="font-mono text-[var(--store-ink)]">{gap.base_id}</dd>
              </div>
            </dl>
          </div>
        </div>
      </StorePanel>

      <div className="grid gap-4 md:grid-cols-2">
        <StorePanel className="p-5">
          <PanelTitle>Required effect</PanelTitle>
          <p className="text-[14px] leading-relaxed text-[var(--store-ink)]">{gap.required_effect}</p>
          {catalogue.length ? (
            <div className="mt-5 border-t border-[var(--store-line)] pt-4">
              <p className="mb-2.5 text-xs store-text-muted">
                Catalogued C-UAS rated 50% or better kinetic against this threat ({catalogue.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {shownCatalogue.map((s) => (
                  <span key={s} className="tag">{s}</span>
                ))}
              </div>
              {catalogue.length > CATALOGUE_PREVIEW ? (
                <button
                  type="button"
                  className="fc-action mt-2"
                  aria-expanded={showAllCatalogue}
                  onClick={() => setShowAllCatalogue((v) => !v)}
                >
                  {showAllCatalogue ? 'Show fewer' : `Show all ${catalogue.length}`}
                </button>
              ) : null}
            </div>
          ) : null}
        </StorePanel>

        <StorePanel className="p-5">
          <PanelTitle meta={`${gap.orbat_platform_count} platforms`}>ORBAT context</PanelTitle>
          <ul className="space-y-2">
            {gap.orbat_summary.map((line) => (
              <li key={line} className="flex gap-2.5 text-[13px] leading-relaxed store-text-body">
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[var(--store-ink-mute)]" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </StorePanel>
      </div>

      <StorePanel className="p-5">
        <PanelTitle>Coverage gaps</PanelTitle>
        <ol className="divide-y divide-[var(--store-line)]">
          {gap.coverage_gaps.map((item, i) => (
            <li key={item} className="flex gap-4 py-3 first:pt-1 last:pb-0">
              <span className="w-5 shrink-0 pt-px text-right font-mono text-[13px] tabular-nums store-text-muted">
                {i + 1}
              </span>
              <span className="text-[14px] leading-relaxed text-[var(--store-ink)]">{item}</span>
            </li>
          ))}
        </ol>
      </StorePanel>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
        <span className="text-xs store-text-muted">Related</span>
        <Link href="/pcm/force-design" className="fc-action">
          Force Design <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link href="/defeat" className="fc-action">
          Defeat Matrix <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link href="/currency" className="fc-action">
          Currency Queue (MOAT training note, DS view for blind spots) <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
