'use client'

import Link from 'next/link'
import { useState } from 'react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import { getConflictCaseStudies, getConflictCaseStudy } from '@/lib/conflicts/queries'
import { cn } from '@/lib/utils'

export default function ConflictsPage() {
  const cases = getConflictCaseStudies()
  const [selectedId, setSelectedId] = useState<string | null>(cases[0]?.id ?? null)
  const selected = selectedId ? getConflictCaseStudy(selectedId) : null

  return (
    <HubPageShell
      eyebrow="Case Studies"
      title="Conflict Intel"
      subtitle="Named engagements and operational lessons — OSINT case studies"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StorePanel className="p-4 lg:col-span-1">
          <h2 className="text-xs font-semibold store-text-muted uppercase tracking-wider mb-3">
            Case studies ({cases.length})
          </h2>
          <ul className="space-y-2">
            {cases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl border text-sm font-mono transition-colors',
                    selectedId === c.id
                      ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                      : 'border-[var(--store-line)] bg-[var(--store-surface-2)] store-text-body hover:border-cyan/30',
                  )}
                >
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-[10px] store-text-muted mt-0.5">
                    {c.region} · {c.period}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </StorePanel>

        <StorePanel className="p-6 lg:col-span-2 min-h-[320px]">
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-mono store-text-muted">{selected.classification}</p>
                <h2 className="text-lg font-semibold text-white mt-1">{selected.name}</h2>
                <p className="text-xs font-mono text-cyan mt-1">
                  {selected.region} · {selected.period} · Source date: {selected.source_date}
                </p>
              </div>
              <p className="text-sm store-text-body leading-relaxed">{selected.summary}</p>
              <div>
                <h3 className="text-xs font-semibold store-text-muted uppercase mb-2">ORBAT note</h3>
                <p className="text-sm store-text-body font-mono">{selected.orbat_note}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold store-text-muted uppercase mb-2">Key lessons</h3>
                <ul className="list-disc list-inside space-y-1 text-sm store-text-body">
                  {selected.key_lessons.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold store-text-muted uppercase mb-2">Related platforms</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.related_platform_ids.map((id) => (
                    <Link
                      key={id}
                      href={`/platforms/${id}`}
                      className="px-2 py-0.5 rounded-lg store-panel-inner text-[11px] font-mono text-cyan hover:border-[var(--store-accent-border)]"
                    >
                      {id}
                    </Link>
                  ))}
                </div>
              </div>
              {selected.incidents.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold store-text-muted uppercase mb-2">Incidents</h3>
                  {selected.incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="store-panel-inner rounded-xl p-3 mb-2"
                    >
                      <p className="text-sm font-medium text-white">
                        {inc.title}{' '}
                        <span className="store-text-muted font-mono text-xs">({inc.date})</span>
                      </p>
                      <p className="text-xs store-text-body mt-1">{inc.summary}</p>
                      <p className="text-xs font-mono text-[var(--store-accent)] mt-2">So what: {inc.lesson}</p>
                      <p className="text-[10px] store-text-muted mt-1">
                        Confidence: {inc.confidence} · {inc.sources.join('; ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="store-text-muted text-sm font-mono">Select a case study</p>
          )}
        </StorePanel>
      </div>
    </HubPageShell>
  )
}
