'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  parseCommandPlanStreamData,
  type CommandPlanStreamEvent,
} from '@/lib/command/apply-command-stream-event'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

/** Debounce plan.updated reloads so multi-client fanout stays <2s without thrash. */
const SSE_DEBOUNCE_MS = 250
const RECONNECT_BASE_MS = 500
const RECONNECT_MAX_MS = 10_000

export type { CommandPlanStreamEvent }

export function useCommandPlanStream(
  planId: string | null,
  onEvent: (event: CommandPlanStreamEvent) => void,
): void {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const emitEvent = useCallback((event: CommandPlanStreamEvent) => {
    // Decision payloads must apply immediately for peer sync AC (<2s).
    if (event.type === 'command.go_no_go.decision') {
      onEventRef.current(event)
      return
    }
    // Debounce assessment reloads (plan.updated and other refresh triggers).
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = setTimeout(() => {
      onEventRef.current(event)
    }, SSE_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    if (!planId || !isOperationsEditionClient()) return

    let disposed = false
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const connect = () => {
      if (disposed) return
      clearReconnect()
      source = new EventSource(`/api/v1/plans/${planId}/stream`)

      source.onopen = () => {
        attempt = 0
      }

      source.onmessage = (msg) => {
        const event = parseCommandPlanStreamData(String(msg.data ?? ''))
        if (!event) return
        emitEvent(event)
      }

      source.onerror = () => {
        source?.close()
        source = null
        if (disposed) return
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS)
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      clearReconnect()
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
      source?.close()
      source = null
    }
  }, [planId, emitEvent])
}
