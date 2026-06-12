import { requireTenantContext } from '@/lib/operations/tenant'
import { subscribeScenario } from '@/lib/wopr/live-bus'
import { getScenario } from '@/lib/wopr/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEARTBEAT_MS = 25_000

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireTenantContext(request)
  if (!ctx.userId) {
    return new Response('Unauthorised', { status: 401 })
  }

  const scenario = await getScenario(params.id, ctx.tenantId)
  if (!scenario) return new Response('Not found', { status: 404 })

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let closed = false

  const cleanup = (controller: ReadableStreamDefaultController, reason: string) => {
    if (closed) return
    closed = true
    if (heartbeat) clearInterval(heartbeat)
    unsubscribe?.()
    unsubscribe = null
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'close', payload: { reason } })}\n\n`),
      )
      controller.close()
    } catch {
      // stream already closed
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'connected', scenarioId: params.id, tenantId: ctx.tenantId })}\n\n`,
        ),
      )

      unsubscribe = subscribeScenario(ctx.tenantId, params.id, (event) => {
        if (closed) return
        if (event.type === 'close') {
          cleanup(controller, 'server_channel_closed')
          return
        }
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          cleanup(controller, 'enqueue_failed')
        }
      })

      heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          cleanup(controller, 'heartbeat_failed')
        }
      }, HEARTBEAT_MS)
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      unsubscribe?.()
      unsubscribe = null
      closed = true
    },
  })

  request.signal.addEventListener('abort', () => {
    if (heartbeat) clearInterval(heartbeat)
    unsubscribe?.()
    unsubscribe = null
    closed = true
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
