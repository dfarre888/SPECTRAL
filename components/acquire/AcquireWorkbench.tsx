'use client'

import { useId, useState } from 'react'
import type { AcquireSession, AcquireStep } from '@/lib/acquire/acquire-types'
import { BriefPanel } from '@/components/acquire/BriefPanel'
import { CalcPanel } from '@/components/acquire/CalcPanel'
import { GapPanel } from '@/components/acquire/GapPanel'
import { OptionCards } from '@/components/acquire/OptionCards'
import { cn } from '@/lib/utils'

const STEPS: { id: AcquireStep; label: string }[] = [
  { id: 'gap', label: 'GAP' },
  { id: 'option', label: 'OPTION' },
  { id: 'calc', label: 'CALC' },
  { id: 'brief', label: 'BRIEF' },
]

interface AcquireWorkbenchProps {
  initialSession: AcquireSession
}

export function AcquireWorkbench({ initialSession }: AcquireWorkbenchProps) {
  const [step, setStep] = useState<AcquireStep>('gap')
  const session = initialSession
  const baseId = useId()

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2 border-b border-[var(--store-line)] pb-4"
        role="tablist"
        aria-label="Acquisition workflow steps"
      >
        {STEPS.map(({ id, label }) => {
          const selected = step === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${id}`}
              onClick={() => setStep(id)}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-mono font-semibold tracking-widest transition-colors border',
                selected
                  ? 'border-[var(--store-accent-border)] bg-[var(--store-accent-glow)] text-[var(--store-accent)]'
                  : 'border-transparent store-text-muted hover:text-white hover:bg-[var(--store-surface-2)]',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-gap`}
        aria-labelledby={`${baseId}-tab-gap`}
        hidden={step !== 'gap'}
      >
        {step === 'gap' ? (
          <GapPanel gap={session.gap} templateTitle={session.template.title} />
        ) : null}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-option`}
        aria-labelledby={`${baseId}-tab-option`}
        hidden={step !== 'option'}
      >
        {step === 'option' ? (
          <OptionCards options={session.options} threatId={session.template.threat_platform_id} />
        ) : null}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-calc`}
        aria-labelledby={`${baseId}-tab-calc`}
        hidden={step !== 'calc'}
      >
        {step === 'calc' ? <CalcPanel calc={session.calc} /> : null}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-brief`}
        aria-labelledby={`${baseId}-tab-brief`}
        hidden={step !== 'brief'}
      >
        {step === 'brief' ? <BriefPanel brief={session.brief} /> : null}
      </div>
    </div>
  )
}
