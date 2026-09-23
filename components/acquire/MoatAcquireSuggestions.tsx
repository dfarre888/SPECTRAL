'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { AcquireSuggestedGap } from '@/lib/acquire/acquire-types'
import { StorePanel } from '@/components/ui/store-surface'

interface MoatAcquireSuggestionsProps {
  suggestions: AcquireSuggestedGap[]
}

const SEVERITY_TAG: Record<string, string> = {
  critical: 'tag red',
  high: 'tag amber',
  moderate: 'tag',
  low: 'tag',
}

export function MoatAcquireSuggestions({ suggestions }: MoatAcquireSuggestionsProps) {
  const searchParams = useSearchParams()
  const fromMoat = searchParams.get('from') === 'moat'

  const visible = useMemo(() => {
    if (!fromMoat || suggestions.length === 0) return []
    const competency = searchParams.get('competency')
    if (!competency) return suggestions
    return suggestions.filter((s) => s.competency === competency)
  }, [fromMoat, suggestions, searchParams])

  if (visible.length === 0) return null

  return (
    <StorePanel className="mb-6 p-5" data-testid="moat-acquire-suggestions">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[var(--store-ink)]">Suggested from MOAT</h2>
        <span className="tag">Read-only</span>
      </div>
      <p className="mb-4 text-[13px] store-text-body">
        Competency gaps suggested from learner blind spots. OSINT economics only; no accredited Pk.
      </p>
      <ul className="divide-y divide-[var(--store-line)]">
        {visible.map((s) => (
          <li key={s.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
            <span className={SEVERITY_TAG[s.severity] ?? 'tag'}>
              {s.severity.charAt(0).toUpperCase() + s.severity.slice(1)}
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--store-ink)]">{s.narrative}</span>
            {s.suggested_template_id ? (
              <Link href={s.href} className="fc-action">
                Open template <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </StorePanel>
  )
}
