'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import type { AcquireSuggestedGap } from '@/lib/acquire/acquire-types'
import { StorePanel } from '@/components/ui/store-surface'

interface MoatAcquireSuggestionsProps {
  suggestions: AcquireSuggestedGap[]
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
    <StorePanel className="p-4 mb-4 border-cyan/30" data-testid="moat-acquire-suggestions">
      <p className="text-[10px] font-mono uppercase tracking-widest text-cyan mb-2">
        MOAT → Acquire (read-only)
      </p>
      <p className="text-[11px] store-text-muted mb-3">
        Competency gaps suggested from learner blind spots. OSINT economics only — no accredited Pk.
      </p>
      <ul className="space-y-2">
        {visible.map((s) => (
          <li key={s.id} className="text-sm store-text-body">
            <span className="font-mono text-[10px] text-amber uppercase mr-2">{s.severity}</span>
            {s.narrative}
            {s.suggested_template_id ? (
              <Link
                href={s.href}
                className="ml-2 text-cyan text-xs hover:underline font-mono"
              >
                Open template
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </StorePanel>
  )
}
