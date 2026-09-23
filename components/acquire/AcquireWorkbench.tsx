'use client'

import { useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { AcquireSession, AcquireStep } from '@/lib/acquire/acquire-types'
import { BriefPanel } from '@/components/acquire/BriefPanel'
import { CalcPanel } from '@/components/acquire/CalcPanel'
import { GapPanel } from '@/components/acquire/GapPanel'
import { OptionCards } from '@/components/acquire/OptionCards'

const STEPS: { id: AcquireStep; label: string; hint: string }[] = [
  { id: 'gap', label: 'Gap', hint: 'What the force cannot do today' },
  { id: 'option', label: 'Options', hint: 'Effectors ranked by cost per expected kill' },
  { id: 'calc', label: 'Calculation', hint: 'Exchange ratio and magazine depth' },
  { id: 'brief', label: 'Brief', hint: 'Acquisition brief to copy or download' },
]

interface AcquireWorkbenchProps {
  initialSession: AcquireSession
}

export function AcquireWorkbench({ initialSession }: AcquireWorkbenchProps) {
  const [step, setStep] = useState<AcquireStep>('gap')
  const session = initialSession
  const baseId = useId()

  const index = STEPS.findIndex((s) => s.id === step)
  const prev = index > 0 ? STEPS[index - 1] : null
  const next = index < STEPS.length - 1 ? STEPS[index + 1] : null

  const stepperRef = useRef<HTMLDivElement | null>(null)

  const go = (id: AcquireStep, fromFooter = false) => {
    setStep(id)
    // From the footer the reader is at the bottom of the old step: bring the
    // stepper back into view so the new step starts at its top.
    if (fromFooter) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      stepperRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  return (
    <div className="space-y-6">
      <div ref={stepperRef} className="flex scroll-mt-[72px] flex-wrap items-center gap-x-5 gap-y-3">
        <div className="seg" role="tablist" aria-label="Acquisition workflow steps">
          {STEPS.map(({ id, label }, i) => {
            const selected = step === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${id}`}
                onClick={() => go(id)}
              >
                <span
                  className={
                    'inline-flex h-[18px] w-[18px] items-center justify-center rounded-full font-mono text-[11px] ' +
                    (selected
                      ? 'bg-[var(--wb-blue)] text-white'
                      : i < index
                        ? 'border border-[rgba(41,151,255,0.6)] text-[var(--wb-blue)]'
                        : 'border border-[rgba(255,255,255,0.22)] store-text-muted')
                  }
                  aria-hidden
                >
                  {i + 1}
                </span>
                {label}
              </button>
            )
          })}
        </div>
        <p className="text-[13px] store-text-muted">
          Step {index + 1} of {STEPS.length}: {STEPS[index].hint}
        </p>
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

      <nav
        className="flex items-center justify-between gap-3 border-t border-[var(--store-line)] pt-5"
        aria-label="Workflow navigation"
      >
        {prev ? (
          <button type="button" className="btn-glass" onClick={() => go(prev.id, true)}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {prev.label}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button type="button" className="btn-glass primary" onClick={() => go(next.id, true)}>
            Next: {next.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </nav>
    </div>
  )
}
