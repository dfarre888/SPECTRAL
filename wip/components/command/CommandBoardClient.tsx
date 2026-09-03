'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { GoNoGoBoard } from '@/components/command/GoNoGoBoard'
import {
  useCommandPlanStream,
  type CommandPlanStreamEvent,
} from '@/components/command/useCommandPlanStream'
import { applyCommandStreamDecision } from '@/lib/command/apply-command-stream-event'
import type { CommandPlanOption, GoNoGoAssessment } from '@/lib/command/go-no-go-types'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

interface CommandBoardClientProps {
  initialPlans: CommandPlanOption[]
  initialPlanId: string | null
}

export function CommandBoardClient({ initialPlans, initialPlanId }: CommandBoardClientProps) {
  const [plans] = useState(initialPlans)
  const [planId, setPlanId] = useState<string | null>(initialPlanId ?? initialPlans[0]?.id ?? null)
  const [assessment, setAssessment] = useState<GoNoGoAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadAssessment = useCallback(async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (planId) params.set('plan_id', planId)
      const res = await fetch(`/api/v1/command/assessment?${params.toString()}`, {
        signal: ac.signal,
      })
      if (!res.ok) throw new Error('Assessment fetch failed')
      const json = (await res.json()) as { data: GoNoGoAssessment }
      if (!ac.signal.aborted) {
        setAssessment(json.data)
        setLastSyncedAt(Date.now())
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError('Unable to load GO/NO-GO assessment')
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    void loadAssessment()
    return () => abortRef.current?.abort()
  }, [loadAssessment])

  const handleStreamEvent = useCallback(
    (event: CommandPlanStreamEvent) => {
      if (event.type === 'command.go_no_go.decision') {
        setAssessment((prev) => {
          if (!prev) return prev
          const next = applyCommandStreamDecision(prev, event.payload)
          return next ?? prev
        })
        setLastSyncedAt(Date.now())
        return
      }
      if (event.type === 'plan.updated') {
        void loadAssessment()
      }
    },
    [loadAssessment],
  )

  useCommandPlanStream(planId, handleStreamEvent)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {plans.length > 0 ? (
          <label className="flex items-center gap-2 text-sm store-text-body">
            <span className="text-[10px] font-mono uppercase tracking-widest store-text-muted">Plan</span>
            <select
              value={planId ?? ''}
              onChange={(e) => setPlanId(e.target.value || null)}
              className="rounded-lg border border-[var(--store-line)] bg-[var(--store-surface-2)] px-3 py-1.5 text-sm text-white font-mono"
            >
              <option value="">OSINT defaults</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={() => void loadAssessment()}
          disabled={loading}
          className="store-btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          Manual refresh
        </button>

        {isOperationsEditionClient() && planId ? (
          <span className="text-[10px] font-mono text-cyan">
            Operations SSE linked
            {lastSyncedAt != null ? ` · sync ${Math.max(0, Math.round((Date.now() - lastSyncedAt) / 1000))}s ago` : ''}
          </span>
        ) : (
          <span className="text-[10px] font-mono store-text-muted">Training — static OSINT + manual refresh</span>
        )}
      </div>

      {error ? <p className="text-sm text-red font-mono">{error}</p> : null}

      {assessment ? <GoNoGoBoard assessment={assessment} planId={planId} /> : null}

      {!assessment && loading ? (
        <p className="text-sm store-text-muted font-mono">Assessing launch criteria…</p>
      ) : null}
    </div>
  )
}
