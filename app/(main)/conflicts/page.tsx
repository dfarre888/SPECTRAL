'use client'

import { useState } from 'react'
import { HubPageShell } from '@/components/hub/HubPageShell'
import { StorePanel } from '@/components/ui/store-surface'
import { getConflictCaseStudies, getConflictCaseStudy } from '@/lib/conflicts/queries'

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
          <h2 className="text-xs font-mono text-t-muted uppercase tracking-wider mb-3">
            Case studies ({cases.length})
          </h2>
          <ul className="space-y-2">
            {cases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded border text-sm font-mono transition-colors ${
                    selectedId === c.id
                      ? 'border-orange/50 bg-orange/10 text-orange'
                      : 'border-border bg-surf2 text-t-secondary hover:border-cyan/30'
                  }`}
                >
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-[10px] text-t-muted mt-0.5">
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
                <p className="text-[10px] font-mono text-t-muted">{selected.classification}</p>
                <h2 className="text-lg font-semibold text-t-primary mt-1">{selected.name}</h2>
                <p className="text-xs font-mono text-cyan mt-1">
                  {selected.region} · {selected.period} · Source date: {selected.source_date}
                </p>
              </div>
              <p className="text-sm text-t-secondary leading-relaxed">{selected.summary}</p>
              <div>
                <h3 className="text-xs font-mono text-t-muted uppercase mb-2">ORBAT note</h3>
                <p className="text-sm text-t-secondary font-mono">{selected.orbat_note}</p>
              </div>
              <div>
                <h3 className="text-xs font-mono text-t-muted uppercase mb-2">Key lessons</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-t-secondary">
                  {selected.key_lessons.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-mono text-t-muted uppercase mb-2">Related platforms</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.related_platform_ids.map((id) => (
                    <span
                      key={id}
                      className="px-2 py-0.5 rounded bg-surf2 border border-border text-[11px] font-mono text-cyan"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
              {selected.incidents.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-t-muted uppercase mb-2">Incidents</h3>
                  {selected.incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="border border-border rounded p-3 mb-2 bg-surf2/50"
                    >
                      <p className="text-sm font-medium text-t-primary">
                        {inc.title}{' '}
                        <span className="text-t-muted font-mono text-xs">({inc.date})</span>
                      </p>
                      <p className="text-xs text-t-secondary mt-1">{inc.summary}</p>
                      <p className="text-xs font-mono text-orange mt-2">So what: {inc.lesson}</p>
                      <p className="text-[10px] text-t-muted mt-1">
                        Confidence: {inc.confidence} · {inc.sources.join('; ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-t-muted text-sm font-mono">Select a case study</p>
          )}
        </StorePanel>
      </div>
    </HubPageShell>
  )
}
